// src/FloatingChipsBackground.jsx
import React, { useEffect } from 'react';
import './FloatingChipsBackground.css'; // if you're using CSS

export default function FloatingChipsBackground() {
  useEffect(() => {
    const container = document.getElementById('animation-container');
    const keywords = [
      "AI", "Cybersecurity", "Defense", "GovTech", "Grants",
      "Innovation", "Machine Learning", "National Security", "Quantum", "Intelligence",
      "Drones", "Satellites", "Space Force", "Army", "Navy"
    ];

    const numberOfChips = 30;

    function getRandom(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createChip(keyword) {
      const chip = document.createElement('span');
      chip.className = 'keyword-chip';
      chip.textContent = keyword;

      chip.style.top = `${getRandom(5, 95)}%`;
      chip.style.left = `${getRandom(5, 95)}%`;
      chip.style.animationDelay = `${getRandom(0, 3)}s, ${getRandom(0, 5)}s`;
      chip.style.setProperty('--drift-x', getRandom(-20, 20));
      chip.style.setProperty('--drift-y', getRandom(-20, 20));
      chip.style.animationDuration = `${getRandom(15, 25)}s`;

      container.appendChild(chip);
      return chip;
    }

    function updateChipPosition(chip) {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const chipWidth = chip.offsetWidth;
      const chipHeight = chip.offsetHeight;

      const maxTop = containerHeight - chipHeight - 10;
      const maxLeft = containerWidth - chipWidth - 10;

      const newTop = getRandom(10, maxTop);
      const newLeft = getRandom(10, maxLeft);

      chip.style.top = `${newTop}px`;
      chip.style.left = `${newLeft}px`;

      setTimeout(() => updateChipPosition(chip), 5000 + getRandom(0, 3000));
    }

    const chips = [];
    for (let i = 0; i < numberOfChips; i++) {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      const chip = createChip(keyword);
      chips.push(chip);
    }

    setTimeout(() => {
      chips.forEach(updateChipPosition);
    }, 100);
  }, []);

  return (
    <div
      id="animation-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // ensure it's behind and non-interactive
        overflow: 'hidden',
      }}
    />
  );
}
