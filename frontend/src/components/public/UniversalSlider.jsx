
export const UniversalSlider = ({
    min = 0,
    max = 100,
    value = 100,
    showValue = true,
    className = '',
    label = '',
    onChange
}) => {
    
    const boundedValue = Math.min(Math.max(value,min),max);// 确保值在有效范围内
    
    const handleChange = (e) =>{
        const newValue = parseInt(e.target.value, 10)
        if (onChange) onChange(newValue)
    };

    return (
        <div className={`universal-slider ${className}`}>
            <div className="slider-labelandvalue">
                {label && <span className="slider-label-text">{label}: </span>}
                {value !== undefined && <span className="slider-value-text">{boundedValue}</span>}
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                value={boundedValue}
                className="slider-input"
                onChange={handleChange}
            />
        </div>
    );
};