"use client";

import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as Select from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { questionSchemaDefaultValue, questionTypeItems, UseRisetEditorForm } from "./riset-editor-schema";

type RisetEditorEngineProps = {
    risetEditorForm: UseRisetEditorForm;
};

export default function RisetEditorEngine({ risetEditorForm: { form } }: RisetEditorEngineProps) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
            }}
        >
            <form.Field name="questions" mode="array">
                {(questionsField) =>
                    questionsField.state.value.map((v, questionItemIdx) => (
                        <Card.Card key={`lv0-questions-${questionItemIdx}`} className="w-full">
                            {/* CARD HEADER */}
                            <Card.CardHeader className="space-y-2">
                                {/* Number */}
                                <h3 className="text-xl font-semibold leading-snug">Pertanyaan 1</h3>

                                {/* Tipe Pertanyaan */}
                                <form.Field name={`questions[${questionItemIdx}].questionType`}>
                                    {(field) => (
                                        <Select.Select
                                            items={questionTypeItems}
                                            value={field.state.value}
                                            onValueChange={(e) => {
                                                field.handleChange(e as typeof field.state.value);
                                            }}
                                        >
                                            <Select.SelectTrigger className="w-full">
                                                <Select.SelectValue />
                                            </Select.SelectTrigger>
                                            <Select.SelectContent>
                                                <Select.SelectGroup>
                                                    <Select.SelectLabel>Tipe Pertanyaan</Select.SelectLabel>
                                                    {questionTypeItems.map((item) => (
                                                        <Select.SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </Select.SelectItem>
                                                    ))}
                                                </Select.SelectGroup>
                                            </Select.SelectContent>
                                        </Select.Select>
                                    )}
                                </form.Field>

                                {/* Pertanyaan */}
                                <form.Field name={`questions[${questionItemIdx}].question`}>
                                    {(field) => (
                                        <Textarea
                                            placeholder="Ketik pertanyaanmu disini"
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                    )}
                                </form.Field>
                            </Card.CardHeader>

                            {/* CARD CONTENT */}
                            <Card.CardContent>
                                <form.Field name={`questions[${questionItemIdx}].choices`}>
                                    {(questionField) => (
                                        <>
                                            <div className="flex flex-col space-y-2">
                                                <p>Pilihan Jawaban | {questionsField.state.value[questionItemIdx].questionType}</p>
                                                {questionField.state.value.map((choice, choiceIdx) => (
                                                    <div className="flex items-center space-x-2" key={choiceIdx}>
                                                        <form.Field
                                                            name={`questions[${questionItemIdx}].choices[${choiceIdx}].choiceText`}
                                                            key={choiceIdx}
                                                        >
                                                            {(field) => (
                                                                <Input
                                                                    placeholder="masukkan pilihan kamu"
                                                                    value={field.state.value}
                                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                                />
                                                            )}
                                                        </form.Field>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (questionField.state.value.length < 2) return;
                                                                questionField.removeValue(choiceIdx);
                                                            }}
                                                        >
                                                            Hapus
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (questionField.state.value.length === 5) return;
                                                    questionField.pushValue(questionSchemaDefaultValue[0].choices[0]);
                                                }}
                                            >
                                                Tambah Pilihan
                                            </Button>
                                        </>
                                    )}
                                </form.Field>
                            </Card.CardContent>

                            <Card.CardFooter className="flex-col gap-2"></Card.CardFooter>
                        </Card.Card>
                    ))
                }
            </form.Field>
        </form>
    );
}
