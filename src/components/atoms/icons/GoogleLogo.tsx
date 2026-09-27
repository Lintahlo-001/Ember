import Svg, { Path } from 'react-native-svg';

export default function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.4-6.4C35.6 2.8 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.5 5.8C12 13 17.5 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.4-4.7 7.1l7.3 5.7C43.8 37.6 46.5 31.6 46.5 24.5z" />
      <Path fill="#FBBC05" d="M10.1 19c-.5 1.6-.8 3.3-.8 5s.3 3.4.8 5l-7.5 5.8C.9 31.4 0 27.8 0 24s.9-7.4 2.6-10.8L10.1 19z" />
      <Path fill="#34A853" d="M24 48c6.1 0 11.6-2 15.5-5.5l-7.3-5.7c-2 1.4-4.7 2.2-8.2 2.2-6.5 0-12-4.5-13.9-10.5l-7.5 5.8C6.5 42.6 14.6 48 24 48z" />
    </Svg>
  );
}