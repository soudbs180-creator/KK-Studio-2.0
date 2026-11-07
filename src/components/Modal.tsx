import type { ComponentProps } from "react";
import type Dialog from "../shared/ui/Dialog";
import { ModalDialog } from "./ui/ModalDialog";

export default function Modal(props: ComponentProps<typeof Dialog>) {
  return <ModalDialog {...props} isOpen chrome={false} />;
}
