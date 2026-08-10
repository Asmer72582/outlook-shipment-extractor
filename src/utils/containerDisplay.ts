export function formatContainerHawb(containerNo: string, hawb: string | null): string {
  if (!hawb || hawb === containerNo) return containerNo;
  return `${containerNo} / ${hawb}`;
}
