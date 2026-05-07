import clsx from 'clsx';

export const Button = ({ children, variant = 'primary', className, loading, ...props }) => {
  const baseStyles = "btn-transition font-weight-600 position-relative overflow-hidden";
  const variants = {
    primary: "btn-primary-custom",
    auth: "btn-auth",
    danger: "btn-danger",
    ghost: "btn-ghost"
  };

  return (
    <button 
      className={clsx(baseStyles, variants[variant], className, { 'btn-loading': loading })}
      disabled={loading}
      {...props}
    >
      {loading && (
        <span className="btn-loader">
          <i className="fas fa-spinner fa-spin"></i>
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;