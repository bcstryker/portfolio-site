import type { Metadata } from 'next';
import SubnetGame from './subnet-game';

export const metadata: Metadata = {
  title: 'Subnetting Practice | Brandon Stryker',
  description: 'Practice IPv4 and IPv6 subnetting with instant answer checks and step-by-step worked solutions.',
};

export default function SubnettingPage() {
  return <SubnetGame />;
}
