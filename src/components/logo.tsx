const BALL_PATH =
  "M100 0A100 100 0 1 1-100 0A100 100 0 1 1 100 0ZM91 0A91 91 0 1 1-91 0A91 91 0 1 1 91 0ZM-38-76.03V7H-84.71A85 85 0 0 1-38-76.03ZM-6-84.79A85 85 0 0 1 84.71 7H-6ZM-82.85 19H-38V76.03A85 85 0 0 1-82.85 19ZM-6 19H82.85A85 85 0 0 1-6 84.79Z"
const BALL_CENTERS_X = [100, 296]
const BALL_CENTER_Y = 100

type LogoProps = {
  className?: string
}

export const Logo = ({ className }: LogoProps) => (
  <svg
    viewBox="0 0 396 200"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    {BALL_CENTERS_X.map((x) => (
      <path
        key={x}
        transform={`translate(${x} ${BALL_CENTER_Y})`}
        fillRule="evenodd"
        d={BALL_PATH}
      />
    ))}
  </svg>
)
