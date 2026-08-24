"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function PromoBanner() {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    let activeFetch = true;
    fetch("/api/platform/promos?v=" + Date.now(), { cache: "no-store" })
      .then((res) => res.json())
      .then((resData) => {
        if (activeFetch && resData?.success && Array.isArray(resData?.data?.carousel)) {
          // FORCE OVERRIDE DB DATA
          const defaultImages = ["/design/banners/wingo-payout-v2.png", "/design/banners/first-deposit-bonus-v2.png", "/design/banners/login-bonus-v2.png"];
          resData.data.carousel = resData.data.carousel.map((b, index) => ({
            ...b,
            image: defaultImages[index % defaultImages.length]
          }));
          setSlides(resData.data.carousel);
        }
      })
      .catch((err) => {
        console.error("Failed to load promo banners:", err);
      });
    return () => {
      activeFetch = false;
    };
  }, []);

  const activeSlides = slides.length > 0 ? slides : [
    { id: "slide-1", title: "Join Lucky Nova", image: "/design/banners/wingo-payout-v2.png", link: "/wingo/30s" },
    { id: "slide-2", title: "First Deposit Bonus", image: "/design/banners/first-deposit-bonus-v2.png", link: "/wallet/deposit" },
    { id: "slide-3", title: "Login Reward Tier", image: "/design/banners/login-bonus-v2.png", link: "/account/vip" }
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      setActive(index);
    }
  };

  useEffect(() => {
    if (activeSlides.length <= 1) return undefined;
    const timer = setInterval(() => {
      if (!scrollRef.current) return;
      const nextActive = (active + 1) % activeSlides.length;
      const clientWidth = scrollRef.current.clientWidth;
      
      scrollRef.current.scrollTo({
        left: nextActive * clientWidth,
        behavior: "smooth" });
      setActive(nextActive);
    }, 4500);

    return () => clearInterval(timer);
  }, [active, activeSlides.length]);

  return (
    <div className="club-banner-wrap-scroller">
      <div
        className="club-banner-scroll-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {activeSlides.map((slide, index) => (
          <div key={slide.id} className="club-banner-slide-item">
            <div className="club-banner-slide-inner">
              <a href={slide.link || "#"} style={{ display: "block", width: "100%", height: "100%", position: "relative" }}>
                <Image
                  src={slide.image}
                  alt={slide.title || "Promotion Banner"}
                  fill
                  sizes="(max-width: 480px) 100%, 480px"
                  className="club-banner-img"
                  priority={index === 0}
                />
              </a>
            </div>
          </div>
        ))}
      </div>

      {activeSlides.length > 1 && (
        <div className="club-banner-dots">
          {activeSlides.map((_, i) => (
            <span
              key={i}
              className={i === active ? "active" : ""}
              onClick={() => {
                if (!scrollRef.current) return;
                const clientWidth = scrollRef.current.clientWidth;
                scrollRef.current.scrollTo({
                  left: i * clientWidth,
                  behavior: "smooth" });
                setActive(i);
              }}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
