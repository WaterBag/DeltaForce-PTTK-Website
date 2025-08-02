import armors from '../../assets/data/armors';
import helmets from '../../assets/data/helmets';
import GenericSelector from '../public/GenericSelector';
import './ArmorSittings.css';

export const HelmetSelector = ({selectedHelmet,onSelect}) => {
    return (
        <GenericSelector
            options={helmets}
            selectedOption={selectedHelmet}
            onSelect={onSelect}
            placeholder='选择头盔'
            className='helmet-selector'
            renderSelected={(helmet) => (
                <>
                    <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
                    <span className="helmet-option-name">{helmet.name}</span>
                </>
            )}
        />
    );
};

export const ArmorSelector = ({selectedArmor,onSelect}) => {
    return (
        <GenericSelector
            options={armors}
            selectedOption={selectedArmor}
            onSelect={onSelect}
            placeholder='选择护甲'
            className='armor-selector'
            renderSelected={(armor) => (
                <>
                    <img src={armor.image} alt={armor.name} className="armor-option-image" />
                    <span className="armor-option-name">{armor.name}</span>
                </>
            )}
        />
    );
};