"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Database, Wand2, BarChart2 } from "lucide-react";

const lucideIcons = [Database, Wand2, BarChart2];

const cardAccents = [
  { border: "#134565", tagBg: "rgba(19,69,101,0.08)", tagColor: "#134565", bullet: "#134565" },
  { border: "#A7B34F", tagBg: "rgba(167,179,79,0.1)", tagColor: "#7a8a25", bullet: "#A7B34F" },
  { border: "#13B38D", tagBg: "rgba(19,179,141,0.08)", tagColor: "#0e8a6c", bullet: "#13B38D" },
];

const FeatureOverview = forwardRef((props, ref) => {
  const t = useTranslations("landing.features");
  const badge = t("badge");
  const title = t("title");
  const description = t("description");
  const cards = t.raw("cards");

  return (
    <section
      ref={ref}
      className="bg-[#F5F5F5] relative overflow-hidden py-24 px-4"
    >
      <div className="text-center py-10">
        <h2
          className="font-bold p-5 pb-10 text-black whitespace-nowrap leading-none"
          style={{
            fontSize: 'calc(100vw / 6)',
          }}
        >
          Maplytics
        </h2>
        <p className="text-xs md:text-base lg:text-lg">{description}</p>
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section heading */}
        <div className="text-center mb-16">
          <span className="inline-block bg-[#134565] rounded-full px-4 py-1 text-xs font-bold tracking-widest uppercase text-white mb-4">
            {badge}
          </span>

          <h2
            id="features-overview"
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#1a2a35] mb-4 leading-tight"
          >
            {title}
          </h2>

          <p className="text-base md:text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {cards.map((card, index) => {
            const LucideIcon = lucideIcons[index];
            const accent = cardAccents[index];

            return (
              <div
                key={index}
                className="bg-white rounded-[20px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] hover:border-gray-200 relative overflow-hidden group"
              >
                {/* Tag + Icon row */}
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      background: accent.tagBg,
                      color: accent.tagColor,
                    }}
                  >
                    {card.tag}
                  </span>
                  <div
                    style={{
                      background: accent.tagBg,
                      borderRadius: "12px",
                      padding: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LucideIcon size={26} color={accent.border} strokeWidth={1.8} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#1a2a35] leading-snug m-0">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-[0.95rem] text-[#5C5C5C] leading-relaxed m-0 grow">
                  {card.description}
                </p>

                {/* Bullet list */}
                {card.bullets && (
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {card.bullets.map((bullet, bIdx) => (
                      <li
                        key={bIdx}
                        className="flex items-center gap-2 text-sm text-[#444]"
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: accent.bullet,
                            flexShrink: 0,
                          }}
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

FeatureOverview.displayName = "FeatureOverview";

export default FeatureOverview;
