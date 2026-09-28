// Curated font selection for PDF catalog reports
export const PDF_FONT_OPTIONS = [
  // --- SERIF ELEGANTE & LUSSO (Ferrari, Alfa Romeo, Maserati style) ---
  { id: 'playfair', name: 'Playfair Display (Lusso / Catalogo)', family: "'Playfair Display', serif", group: 'Serif Eleganti' },
  { id: 'bodoni', name: 'Bodoni Moda (Alta Moda / Ferrari)', family: "'Bodoni Moda', serif", group: 'Serif Eleganti' },
  { id: 'cormorant', name: 'Cormorant Garamond (Regale)', family: "'Cormorant Garamond', serif", group: 'Serif Eleganti' },
  { id: 'cinzel', name: 'Cinzel (Lapidario Classico)', family: "'Cinzel', serif", group: 'Serif Eleganti' },
  { id: 'lora', name: 'Lora (Editoriale Raffinato)', family: "'Lora', serif", group: 'Serif Eleganti' },
  { id: 'eb_garamond', name: 'EB Garamond (Storico)', family: "'EB Garamond', serif", group: 'Serif Eleganti' },
  { id: 'merriweather', name: 'Merriweather (Tradizionale)', family: "'Merriweather', serif", group: 'Serif Eleganti' },
  { id: 'times', name: 'Times New Roman (Classico)', family: "'Times New Roman', Times, serif", group: 'Serif Eleganti' },

  // --- SANS-SERIF MODERNO, TECH & SPORT (Porsche, BMW, Audi style) ---
  { id: 'plus_jakarta', name: 'Plus Jakarta Sans (Moderno Tech)', family: "'Plus Jakarta Sans', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'inter', name: 'Inter (Pulito & Minimale)', family: "'Inter', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'montserrat', name: 'Montserrat (Geometrico)', family: "'Montserrat', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'outfit', name: 'Outfit (Contemporaneo)', family: "'Outfit', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'raleway', name: 'Raleway (Elegante Sottile)', family: "'Raleway', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'space_grotesk', name: 'Space Grotesk (Futuristico)', family: "'Space Grotesk', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'oswald', name: 'Oswald (Condensato Sportivo)', family: "'Oswald', sans-serif", group: 'Sans-Serif Moderni' },
  { id: 'system_sans', name: 'System Sans (Arial / Helvetica)', family: "system-ui, -apple-system, sans-serif", group: 'Sans-Serif Moderni' },
];

export const getDefaultPdfFont = () => {
  const savedId = localStorage.getItem('pdf_report_selected_font');
  return PDF_FONT_OPTIONS.find(f => f.id === savedId) || PDF_FONT_OPTIONS[0];
};
