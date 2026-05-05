import './UniversalSlider.css';

export const UniversalSlider = ({
  label = '',
  values,
  value,
  onChange,
  isDisabled = false,
  className = '',
}) => {
  const currentIndex = values.indexOf(value);
  const sliderIndex = currentIndex > -1 ? currentIndex : 0;
  const sliderProgress = values.length > 1
    ? (sliderIndex / (values.length - 1)) * 100
    : 0;

  const handleChange = e => {
    const newIndex = parseInt(e.target.value, 10);
    const newValue = values[newIndex];
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={`universal-slider ${className} ${isDisabled ? 'disabled' : ''}`}>
      <div className="slider-labelandvalue">
        {label && <span className="slider-label-text">{label}: </span>}
        {value !== undefined && <span className="slider-value-text">{value}</span>}
      </div>
      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={sliderIndex}
        className="slider-input"
        style={{ '--slider-progress': `${sliderProgress}%` }}
        disabled={isDisabled}
        onChange={handleChange}
      />
    </div>
  );
};
