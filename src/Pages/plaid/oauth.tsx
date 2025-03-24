import { useEffect } from "react";

export default function PlaidOAuthRedirect() {
  useEffect(() => {
    // This is important: resume the Plaid flow using the current URL
    // Plaid Link on your frontend will use this to finish connecting
    const redirectUrl = window.location.origin; // e.g., localhost:3000 or dev site
    window.location.href = redirectUrl;
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Redirecting you back to the app...</h1>
    </main>
  );
}
