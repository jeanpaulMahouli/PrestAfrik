/**
 * Copie un texte dans le presse-papiers. `navigator.clipboard` n'existe qu'en contexte sécurisé
 * (HTTPS ou localhost) : sur une adresse http du réseau local, on passe par une zone de texte.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Permission refusée : on tente la méthode de secours.
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  // Dans une fenêtre modale (<dialog>), le reste de la page est inerte : la zone doit y être ajoutée.
  const container = document.activeElement?.closest("dialog[open]") ?? document.querySelector("dialog[open]") ?? document.body;
  container.appendChild(area);
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  area.select();
  area.setSelectionRange(0, value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return copied;
}
