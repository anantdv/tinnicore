from __future__ import annotations

import os
import shlex
import subprocess
import tempfile
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
