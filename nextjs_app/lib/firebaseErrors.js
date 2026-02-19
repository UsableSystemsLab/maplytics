/**
 * Maps Firebase Auth error codes to user-friendly messages.
 *
 * Firebase throws errors with codes like "auth/user-not-found" and messages
 * like "Firebase: Error (auth/user-not-found)." — these are developer-facing
 * and confuse end users. This utility translates them to plain language that
 * tells the user what went wrong and what they can do about it.
 */

const ERROR_MESSAGES = {
  "auth/invalid-credential":
    "Incorrect email or password. Please try again.",
  "auth/user-not-found":
    "No account found with this email. Would you like to sign up?",
  "auth/wrong-password":
    "Incorrect password. Please try again or reset your password.",
  "auth/email-already-in-use":
    "An account with this email already exists. Try signing in instead.",
  "auth/weak-password":
    "Password is too weak. Please use at least 6 characters.",
  "auth/invalid-email":
    "Please enter a valid email address.",
  "auth/too-many-requests":
    "Too many failed attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user":
    "Sign-in popup was closed. Please try again.",
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled. Please try a different method.",
};

export function getFirebaseErrorMessage(error) {
  const code = error?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return "Something went wrong. Please try again.";
}
