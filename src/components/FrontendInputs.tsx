import { useState } from "react";

/**
 * `macros/frontend_inputs.html`. The `focus` class on the wrapper is what lifts
 * the floating label; `main.js` adds it on focus and only removes it on blur
 * when the field is still empty.
 */
export function TextInput({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: "text" | "password";
}) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className={focused || value ? "input-box focus" : "input-box"}>
      <label className="input-label">
        <span className="label"> {label} </span>
        <span className="cover_line"></span>
      </label>
      <input
        type={type}
        name={name}
        className={required ? "input-1 needs-validation" : "input-1"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}
