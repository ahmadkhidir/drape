import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FittingsIdRedirect(props: Props) {
  const { id } = await props.params;
  redirect(`/fitting/results/${id}`);
}
