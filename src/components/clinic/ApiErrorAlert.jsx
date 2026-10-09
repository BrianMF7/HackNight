import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ApiErrorAlert({ error, title = "Something went wrong" }) {
  if (!error) return null;
  const fields = Object.entries(error.fieldErrors || {});
  return (
    <Alert variant="destructive" className="bg-destructive/5">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {fields.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-sm">
            {fields.map(([k, v]) => (
              <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}