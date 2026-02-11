
// Servizio rimosso per semplificazione app
export const summarizeWorkDescription = async (description: string): Promise<string> => {
  return description.substring(0, 50);
};
