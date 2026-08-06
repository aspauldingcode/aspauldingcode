import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    basePath: __dirname,
});

const eslintConfig = [
    {
        ignores: [".next/**/*", "node_modules/**/*", "dist/**/*", "out/**/*", "next-env.d.ts"],
    },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "react/no-unescaped-entities": "off",
        }
    }
];

export default eslintConfig;