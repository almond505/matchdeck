export const SESSION_KEY = "fold_reveal_session_id";
export const NAME_KEY = "fold_reveal_display_name";

export function getSessionId() {
  if (typeof window === "undefined") return "";
  const found = localStorage.getItem(SESSION_KEY);
  if (found) return found;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function getSavedName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}
