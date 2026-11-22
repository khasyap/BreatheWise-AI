import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MYTH_VS_FACT = [
  {
    myth: 'Two or three indoor potted plants can clean winter smog out of a bedroom.',
    fact: 'Scientific chamber reviews (Cummings & Waring, 2020) confirm that houseplants remove pollutants far too slowly to clean an actual room—you would need 100+ plants per m² to match one True HEPA purifier.',
    citation: 'Journal of Exposure Science & Environmental Epidemiology (2020)',
  },
  {
    myth: 'Early morning (6 AM) is always the healthiest time for a winter outdoor walk or run.',
    fact: 'During winter temperature inversions, 5 AM – 9 AM frequently records the highest surface PM2.5 of the entire 24-hour cycle. Always check live hourly forecasts before heading out.',
    citation: 'CPCB Winter Air Quality Seasonal Reports / IMD Meteorology',
  },
  {
    myth: 'Surgical blue masks or cloth handkerchiefs filter out fine PM2.5 smog particles.',
    fact: 'Loose surgical and cloth masks leave side air gaps and lack electrostatic particulate media. Properly fitted N95, KN95, or FFP2 respirators without leaks are needed for PM2.5.',
    citation: 'WHO & US EPA Particulate Respirator Guidance',
  },
  {
    myth: 'Closing all windows guarantees indoor air is clean.',
    fact: 'Sealed homes trap indoor combustion sources (gas cooking, oil frying, incense sticks, mosquito coils) and CO₂. Combine sealed windows during smog peaks with kitchen exhaust and HEPA filtration.',
    citation: 'US EPA Indoor Air Quality Technical Guidance',
  },
];

const EDUCATION_TOPICS = [
  {
    id: 'aqi',
    title: 'What is AQI & Why Standards Differ',
    summary:
      'An Air Quality Index converts multiple pollutant concentrations (PM2.5, PM10, NO₂, SO₂, CO, O₃) into a single 0–500 scale governed by the worst-performing (primary) pollutant. India uses CPCB NAQI (6 categories from Good to Severe), while the United States uses US EPA 2024 breakpoints. Comparing raw numbers without naming the standard can be misleading.',
  },
  {
    id: 'pm',
    title: 'PM2.5 vs. PM10: Why Particle Size Matters',
    summary:
      'PM10 particles (≤10 micrometers, about 1/7th the width of a human hair) come mostly from road dust and construction and lodge in the nose and upper airways. PM2.5 particles (≤2.5 micrometers) originate from vehicle exhaust, biomass burning, power plants, and secondary winter haze; they travel deep into pulmonary alveoli and enter the bloodstream.',
  },
  {
    id: 'inversion',
    title: 'Causes of Winter Smog & Temperature Inversion',
    summary:
      'Normally, warm air near the ground rises and carries emissions upward. On calm, cold winter nights, the ground cools rapidly, trapping a cold dense air layer under a warmer air lid above (a temperature inversion). Vehicle exhaust, regional crop-residue smoke, construction dust, and open waste burning then accumulate horizontally at breathing height until daytime sunshine or stronger winds break the lid.',
  },
  {
    id: 'respiratory',
    title: 'Practical Exposure Precautions for Families & Students',
    summary:
      'Reduce exposure dose (Concentration × Breathing Rate × Time). Lower breathing rate during smog by shifting vigorous sports indoors; cut time near idling traffic corridors; create a clean sleeping room at night so lungs recover for 8 continuous hours.',
  },
];

const FAQS = [
  {
    q: 'Does reducing my household CO₂ footprint lower my neighborhood’s AQI tomorrow?',
    a: 'No single household’s CO₂e reduction immediately alters citywide PM2.5 AQI on the same day. However, cutting fuel combustion, avoiding open waste burning, and shifting collectively to electric/public transit reduces both long-term greenhouse warming and regional primary emissions over time.',
  },
  {
    q: 'Are ionizer or ozone air purifiers safe for bedrooms?',
    a: 'Avoid ozone-generating purifiers and disable optional ionizer features. Choose mechanical True HEPA (H13/H14) + activated carbon filtration, which captures fine particles without emitting lung-irritating ozone.',
  },
  {
    q: 'How can children and teenagers participate safely in clean-air action?',
    a: 'Students can check the morning AQI before outdoor sports, organize carpools to school, champion leaf-composting instead of burning in their neighborhood, and remind households to run kitchen exhaust hoods.',
  },
];

export const EducationView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [revealedMyths, setRevealedMyths] = useState<number[]>([0]);
  const [imgFailed, setImgFailed] = useState(false);

  function toggleMyth(idx: number) {
    setRevealedMyths((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E8E4] pb-6">
        <p className="text-xs font-medium text-[#546860]">
          Evidence-Based Environmental Literacy · CPCB, WHO &amp; US EPA References
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Air Quality Education Center</h1>
        <p className="mt-1 text-sm text-[#4A5D55]">
          Understand winter temperature inversions, PM2.5 vs. PM10 particle physics, indoor air science, and common pollution myths.
        </p>
      </div>

      {/* Editorial Winter Temperature Inversion Feature */}
      <section className="overflow-hidden rounded-xl border border-[#DCE3DE] bg-white">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          <div className="lg:col-span-7">
            {!imgFailed ? (
              <img
                src="/src/assets/images/winter_inversion_diagram_1795109500252.jpg"
                alt="Scientific cross-section diagram explaining how winter temperature inversion traps cool polluted urban air under a warm air lid"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-64 w-full object-cover lg:h-full"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-[#F3F8F5] p-6 text-sm text-[#4A5D55] lg:h-full">
                Winter Temperature Inversion Atmospheric Diagram
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center space-y-3 p-6 lg:col-span-5">
            <span className="text-xs font-semibold text-[#165B43]">Atmospheric Physics Explainer</span>
            <h2 className="text-xl font-bold text-[#13231D]">Why Winter Smog Peaks Overnight and at Dawn</h2>
            <p className="text-sm leading-relaxed text-[#354941]">
              On clear, calm winter nights, urban surfaces lose heat quickly, cooling the air closest to the street while a warmer layer persists 200–500 meters overhead. That warm “lid” halts vertical mixing, locking vehicle exhaust, heating smoke, and regional dust near street level until midday sunlight warms the surface again.
            </p>
            <p className="text-xs text-[#5E726A]">
              Key takeaway: Check hourly AQI before early-morning walks, and time brief home ventilation strictly to the afternoon dispersion trough when outdoor air improves.
            </p>
          </div>
        </div>
      </section>

      {/* Core Scientific Explainers */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {EDUCATION_TOPICS.map((t, idx) => (
          <article key={t.id} className="rounded-xl border border-[#DCE3DE] bg-white p-6">
            <span className="font-mono text-xs text-[#165B43]">0{idx + 1}.</span>
            <h2 className="mt-1 text-base font-semibold text-[#13231D]">{t.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#4A5D55]">{t.summary}</p>
          </article>
        ))}
      </section>

      {/* Interactive Myth vs Fact Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#13231D]">Myth vs. Scientific Fact</h2>
          <p className="text-xs text-[#5E726A]">Select any card to inspect the evidence-backed scientific reality.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MYTH_VS_FACT.map((item, idx) => {
            const revealed = revealedMyths.includes(idx);
            return (
              <div key={idx} className="rounded-xl border border-[#DCE3DE] bg-white p-5">
                <p className="text-xs font-semibold text-[#B53D0A]">Common Myth</p>
                <p className="mt-1 text-sm font-medium text-[#13231D]">“{item.myth}”</p>
                <button
                  type="button"
                  onClick={() => toggleMyth(idx)}
                  className="mt-3 text-xs font-semibold text-[#165B43] hover:underline"
                >
                  {revealed ? 'Hide Scientific Fact' : 'Reveal Scientific Fact →'}
                </button>
                {revealed && (
                  <div className="mt-3 border-t border-[#EEF2EF] pt-3">
                    <p className="text-xs font-semibold text-[#165B43]">Scientific Reality</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#354941]">{item.fact}</p>
                    <p className="mt-1.5 text-[11px] text-[#6B7E76]">Reference: {item.citation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <h2 className="text-base font-semibold text-[#13231D]">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y divide-[#EEF2EF]">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="py-3.5 first:pt-0 last:pb-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm font-medium text-[#13231D]"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[#5E726A]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5E726A]" />
                  )}
                </button>
                {isOpen && <p className="mt-2 text-xs leading-relaxed text-[#4A5D55]">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
