"use client";

import { useState } from "react";

import { BrandIntro } from "./BrandIntro";
import { CategoryBubbles } from "./CategoryBubbles";
import type { MenuCategory } from "@/types/menu";

interface MenuSceneProps {
  name: string;
  logo?: string;
  cover?: string | null;
  categories: MenuCategory[];
  coffeeSlug: string;
  offersHref?: string;
  offersCount?: number;
}

export function MenuScene({ name, logo, cover, categories, coffeeSlug, offersHref, offersCount }: MenuSceneProps) {
  const [resetSignal, setResetSignal] = useState(0);

  return (
    <>
      <BrandIntro
        name={name}
        logo={logo}
        cover={cover}
        categoriesCount={categories.length}
        offersHref={offersHref}
        offersCount={offersCount}
        onReset={() => setResetSignal((value) => value + 1)}
      />
      <CategoryBubbles key={resetSignal} coffeeSlug={coffeeSlug} categories={categories} />
    </>
  );
}
