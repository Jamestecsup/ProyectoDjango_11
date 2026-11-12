// Already written (week 10). The variant only changes the class; everything else is forwarded.
export default function Button({ variant = "primary", children, ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}
