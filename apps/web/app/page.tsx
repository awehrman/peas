import styles from "./page.module.css";
import { getNotes } from "database";

export default async function Page(): Promise<JSX.Element> {
  const { notes = [] } = await getNotes();
  console.log({ notes });
  return <div className={styles.page}>Home page</div>;
}
