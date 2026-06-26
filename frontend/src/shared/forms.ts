export type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "password" | "checkbox";
  placeholder?: string;
  help?: string;
};

export type CrudConfig<T> = {
  title: string;
  path: string;
  fields: FormField[];
  createLabel: string;
  defaultValues?: Record<string, string | number | boolean>;
};
