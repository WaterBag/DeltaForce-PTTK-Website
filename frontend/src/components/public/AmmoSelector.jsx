import { GenericSelector } from "./GenericSelector";
import { getRarityClass } from "../../utils/styleUtils"
import './AmmoSelector.css'

export const AmmoSelector = ({options, selectedAmmo, onSelect, placeholder}) => {
  
  return (
    <GenericSelector
        options={options}
        selectedOption={selectedAmmo}
        onSelect={onSelect}
        placeholder={placeholder}
        searchable = {false}
        className='ammo-selector'
        renderSelected={(ammo) => (
            <div className="selected-content-wrapper">
                <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
                <div className="selected-ammo-text">
                    <span className="selected-ammo-name">{ammo.name}</span>
                    <span className="selected-ammo-caliber">{ammo.caliber}</span>
                </div>
            </div>
            )}
            renderOption={(ammo) => (
                <>
                    <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
                    <div className="option-text-wrapper">
                            <span className="option-ammo-name">{ammo.name}</span>
                            <span className="option-ammo-caliber">{ammo.caliber}</span>
                        </div>
                        <div className='ammo-option-info'>
                    </div>
                </>
            )}
    />
  )
}
