import React from "react";
import './ComboSelector.css';

export function ComboSelector({ combinations, selectedCombos, onSelectionChange }) {
  return (
    <ul className="combo-list">
      {combinations.map((combo, index) => {
        // 判断这个组合是否已选
        const comboKey = `${combo.gun_name}-${combo.bullet_name}`;
        const isChecked = selectedCombos.some(c => `${c.gun_name}-${c.bullet_name}` === comboKey);

        return (
          <li key={index}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                onSelectionChange(combo, e.target.checked);
              }}
            />
            {combo.gun_name} - {combo.bullet_name}
          </li>
        );
      })}
    </ul>
  );
}