import Link from "next/link";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { ApplicationForm } from "@/components/applications/application-form";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function NewApplicationPage() {
	return <WorkspaceShell active="Applications" title="WendApply / Neue Bewerbung"><div className="mx-auto max-w-[1000px]"><Link href="/applications" className="flex w-fit items-center gap-2 text-sm font-semibold text-[#8292ae] hover:text-white"><ArrowLeft size={17} />Zurück zu den Bewerbungen</Link><div className="mt-8 flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#12315d] text-[#56c8ff]"><FilePlus2 size={22} /></div><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">Neue Chance</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-white">Bewerbung hinzufügen</h1><p className="mt-2 text-sm text-[#8292ae]">Halte die wichtigsten Details direkt fest.</p></div></div><div className="panel mt-8 rounded-2xl p-5 md:p-8"><ApplicationForm /></div></div></WorkspaceShell>;
}
