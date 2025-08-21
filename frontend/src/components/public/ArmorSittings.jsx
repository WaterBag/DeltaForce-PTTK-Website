import armors from '../../assets/data/armors';
import helmets from '../../assets/data/helmets';
import { GenericSelector } from '../public/GenericSelector';
import './ArmorSittings.css';

export const HelmetSelector = ({selectedHelmet,onSelect,options}) => {
    return (
        <GenericSelector
            options={options}
            selectedOption={selectedHelmet}
            onSelect={onSelect}
            placeholder='选择头盔'
            className='helmet-selector'
            searchable={false}
            renderSelected={(helmet) => (
                <>
                    <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
                    <span className="helmet-option-name">{helmet.name}</span>
                </>
            )}
        />
    );
};

export const ArmorSelector = ({selectedArmor,onSelect,options}) => {
    return (
        <GenericSelector
            options={options}
            selectedOption={selectedArmor}
            onSelect={onSelect}
            placeholder='选择护甲'
            className='armor-selector'
            searchable={false}
            renderSelected={(armor) => (
                <>
                    <img src={armor.image} alt={armor.name} className="armor-option-image" />
                    <span className="armor-option-name">{armor.name}</span>
                </>
            )}
        />
    );
};