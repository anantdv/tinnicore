from __future__ import annotations

import os
import platform
import shlex
import shutil
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class FileWriteResult:
    path: str
    bytes_written: int


@dataclass(slots=True)
class CommandExecutionResult:
    command: str
    returncode: int
    stdout: str
    stderr: str


@dataclass(slots=True)
class SystemSnapshot:
    hostname: str
    primary_ip: str
    kernel_version: str
    cpu_percent: float
    cpu_cores: int
    cpu_model: str
    memory_percent: float
    memory_total_mb: int
    disk_percent: float
    disk_total_gb: int
    uptime_seconds: int
    temperature_c: float | None
    interface_count: int


class SystemCommandExecutor:
    def write_text_atomic(self, path: str, content: str, mode: int = 0o644) -> FileWriteResult:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=str(target.parent)) as handle:
            handle.write(content)
            temp_name = handle.name
        os.chmod(temp_name, mode)
        os.replace(temp_name, target)
        return FileWriteResult(path=str(target), bytes_written=len(content.encode("utf-8")))

    def run_command(self, command: str, timeout_seconds: int | None = None) -> CommandExecutionResult:
        try:
            completed = subprocess.run(
                shlex.split(command),
                capture_output=True,
                text=True,
                check=False,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired as exc:
            return CommandExecutionResult(
                command=command,
                returncode=124,
                stdout=exc.stdout or "",
                stderr=f"Command timed out after {timeout_seconds} seconds",
            )
        return CommandExecutionResult(
            command=command,
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )

    def collect_snapshot(self) -> SystemSnapshot:
        hostname = socket.gethostname()
        return SystemSnapshot(
            hostname=hostname,
            primary_ip=self._detect_primary_ip(hostname),
            kernel_version=platform.release(),
            cpu_percent=round(self._read_cpu_percent(), 1),
            cpu_cores=os.cpu_count() or 1,
            cpu_model=self._read_cpu_model(),
            memory_percent=round(self._read_memory_percent(), 1),
            memory_total_mb=self._read_memory_total_mb(),
            disk_percent=round(self._read_disk_percent(), 1),
            disk_total_gb=self._read_disk_total_gb(),
            uptime_seconds=self._read_uptime_seconds(),
            temperature_c=self._read_temperature_c(),
            interface_count=self._read_interface_count(),
        )

    def _detect_primary_ip(self, hostname: str) -> str:
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            udp_socket.connect(("8.8.8.8", 80))
            return udp_socket.getsockname()[0]
        except OSError:
            try:
                return socket.gethostbyname(hostname)
            except OSError:
                return "127.0.0.1"
        finally:
            udp_socket.close()

    def _read_cpu_percent(self) -> float:
        first = self._read_proc_stat()
        if first is None:
            return min(100.0, os.getloadavg()[0] * 100 / max(os.cpu_count() or 1, 1)) if hasattr(os, "getloadavg") else 0.0

        time.sleep(0.15)
        second = self._read_proc_stat()
        if second is None:
            return 0.0

        idle_delta = second[0] - first[0]
        total_delta = second[1] - first[1]
        if total_delta <= 0:
            return 0.0
        return max(0.0, min(100.0, 100.0 * (1.0 - (idle_delta / total_delta))))

    def _read_proc_stat(self) -> tuple[float, float] | None:
        stat_path = Path("/proc/stat")
        if not stat_path.exists():
            return None

        try:
            fields = stat_path.read_text(encoding="utf-8").splitlines()[0].split()[1:]
            values = [float(value) for value in fields[:8]]
        except (IndexError, OSError, ValueError):
            return None

        idle = values[3] + values[4]
        total = sum(values)
        return idle, total

    def _read_memory_percent(self) -> float:
        total_mb, available_mb = self._read_memory_stats_mb()
        if total_mb <= 0:
            return 0.0
        used_mb = max(total_mb - available_mb, 0)
        return used_mb * 100 / total_mb

    def _read_memory_total_mb(self) -> int:
        total_mb, _ = self._read_memory_stats_mb()
        return total_mb

    def _read_memory_stats_mb(self) -> tuple[int, int]:
        meminfo_path = Path("/proc/meminfo")
        if not meminfo_path.exists():
            page_size = os.sysconf("SC_PAGE_SIZE")
            phys_pages = os.sysconf("SC_PHYS_PAGES")
            total_mb = int(page_size * phys_pages / 1024 / 1024)
            return total_mb, total_mb

        values: dict[str, int] = {}
        try:
            for line in meminfo_path.read_text(encoding="utf-8").splitlines():
                key, raw_value = line.split(":", 1)
                values[key] = int(raw_value.strip().split()[0])
        except (OSError, ValueError):
            return 0, 0

        total_mb = int(values.get("MemTotal", 0) / 1024)
        available_mb = int(values.get("MemAvailable", values.get("MemFree", 0)) / 1024)
        return total_mb, available_mb

    def _read_disk_percent(self) -> float:
        usage = shutil.disk_usage("/")
        if usage.total <= 0:
            return 0.0
        return usage.used * 100 / usage.total

    def _read_disk_total_gb(self) -> int:
        usage = shutil.disk_usage("/")
        return int(round(usage.total / 1024 / 1024 / 1024))

    def _read_uptime_seconds(self) -> int:
        uptime_path = Path("/proc/uptime")
        if uptime_path.exists():
            try:
                return int(float(uptime_path.read_text(encoding="utf-8").split()[0]))
            except (IndexError, OSError, ValueError):
                pass
        return int(time.time())

    def _read_temperature_c(self) -> float | None:
        base_path = Path("/sys/class/thermal")
        if not base_path.exists():
            return None

        temperatures: list[float] = []
        for zone in base_path.glob("thermal_zone*/temp"):
            try:
                raw_value = zone.read_text(encoding="utf-8").strip()
                value = float(raw_value)
            except (OSError, ValueError):
                continue

            if value > 1000:
                value /= 1000.0
            if -20 <= value <= 150:
                temperatures.append(value)

        if not temperatures:
            return None
        return round(max(temperatures), 1)

    def _read_interface_count(self) -> int:
        net_path = Path("/sys/class/net")
        if not net_path.exists():
            return 0
        return len([item for item in net_path.iterdir() if item.name != "lo"])

    def _read_cpu_model(self) -> str:
        cpuinfo_path = Path("/proc/cpuinfo")
        if cpuinfo_path.exists():
            try:
                for line in cpuinfo_path.read_text(encoding="utf-8").splitlines():
                    if line.lower().startswith("model name"):
                        return line.split(":", 1)[1].strip()
            except OSError:
                pass
        return platform.processor() or "Unknown CPU"
