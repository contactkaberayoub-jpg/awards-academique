const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

/**
 * Exports a rendered certificate element to an A4 landscape PDF named
 * `certificate-{code}.pdf`. The element is cloned into an off-screen,
 * un-transformed holder so the exported size is always the true A4 sheet
 * regardless of any responsive scaling applied on screen.
 */
export async function downloadCertificatePdf(element: HTMLElement, certificateCode: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.position = 'fixed';
  holder.style.top = '0';
  holder.style.left = '-20000px';
  holder.style.width = `${A4_LANDSCAPE_WIDTH_MM}mm`;
  holder.style.height = `${A4_LANDSCAPE_HEIGHT_MM}mm`;
  holder.style.pointerEvents = 'none';
  holder.style.zIndex = '-1';

  const clone = element.cloneNode(true) as HTMLElement;
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(clone, {
      scale: Math.max(2, window.devicePixelRatio || 2),
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const image = canvas.toDataURL('image/png');
    pdf.addImage(image, 'PNG', 0, 0, A4_LANDSCAPE_WIDTH_MM, A4_LANDSCAPE_HEIGHT_MM);
    pdf.save(`certificate-${certificateCode}.pdf`);
  } finally {
    holder.remove();
  }
}