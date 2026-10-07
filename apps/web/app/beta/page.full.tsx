import { BetaForm } from "./BetaForm";
import { BetaPage, betaMeta } from "./BetaPage";

export const revalidate = 60;
export const metadata = betaMeta;

export default function Page() {
  return <BetaPage form={<BetaForm />} />;
}
