import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Info } from '@phosphor-icons/react';
import type { CaseFlowStage } from '@/shared/database';

interface StageActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Record<string, string>) => void;
    currentStage: CaseFlowStage;
    nextStage: CaseFlowStage;
}

interface ActionConfig {
    title: string;
    description: string;
    buttonLabel: string;
    fields: {
        key: string;
        label: string;
        type: 'text' | 'date' | 'textarea';
        placeholder?: string;
        required?: boolean;
        defaultValue?: string;
    }[];
    allowFileUpload?: boolean;
    fileType?: string;
}

const ACTION_CONFIGS: Partial<Record<CaseFlowStage, ActionConfig>> = {
    DATA_COLLECTION: {
        title: 'Collection Complete',
        description: 'Mark data collection as complete and proceed to the filed stage.',
        buttonLabel: 'Mark Collected',
        fields: [
            { key: 'triggerDate', label: 'Completion Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add any specific notes about the collection process...' }
        ]
    },
    FILED: {
        title: 'Record Official Filing',
        description: 'Enter the official filing number and date received from the registry receipt.',
        buttonLabel: 'Complete Filing',
        fields: [
            { key: 'filingNumber', label: 'Filing Number', type: 'text', placeholder: 'e.g. ET/TM/2026/1234', required: true },
            { key: 'triggerDate', label: 'Filing Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Filing Notes', type: 'textarea', placeholder: 'Add any specific notes about the filing process...' }
        ]
    },
    SUBSTANTIVE_EXAM: {
        title: 'Record Examination Result',
        description: 'Update the case based on the examiner\'s findings.',
        buttonLabel: 'Submit Result',
        fields: [
            { key: 'triggerDate', label: 'Exam Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Examiner Remarks', type: 'textarea', placeholder: 'Summary of the examination report...' }
        ]
    },
    AMENDMENT_PENDING: {
        title: 'Log Office Action Response',
        description: 'Confirm the date of response and upload the submission document.',
        buttonLabel: 'Record Response',
        fields: [
            { key: 'triggerDate', label: 'Response Filing Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Response Details', type: 'textarea', placeholder: 'Summary of arguments submitted...' }
        ],
        allowFileUpload: true,
        fileType: 'OFFICE_ACTION_RESPONSE'
    },
    CERTIFICATE_REQUEST: {
        title: 'Upload Registration Certificate',
        description: 'Provide the official registration certificate details and upload the scan.',
        buttonLabel: 'Finalize Registration',
        fields: [
            { key: 'certificateNumber', label: 'Certificate Number', type: 'text', placeholder: 'e.g. REG/ET/00987', required: true },
            { key: 'triggerDate', label: 'Registration Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any additional details...' }
        ],
        allowFileUpload: true,
        fileType: 'REGISTRATION_CERTIFICATE'
    },
    RENEWAL_PENALTY: {
        title: 'Process Penalty Renewal',
        description: 'Upload proof of surcharge payment for late renewal.',
        buttonLabel: 'Complete Renewal',
        fields: [
            { key: 'triggerDate', label: 'Penalty Payment Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Details about the penalty payment...' }
        ],
        allowFileUpload: true,
        fileType: 'PRIORITY'
    }
};

export function StageActionModal({ isOpen, onClose, onConfirm, currentStage, nextStage }: StageActionModalProps) {
    const config = ACTION_CONFIGS[currentStage] || {
        title: 'Advance Stage',
        description: `Confirm advancement to ${nextStage.replace(/_/g, ' ')}.`,
        buttonLabel: 'Confirm',
        fields: [
            { key: 'triggerDate', label: 'Effective Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional notes about this transition...' }
        ]
    };

    const [formData, setFormData] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        config.fields.forEach(f => {
            if (f.defaultValue) initial[f.key] = f.defaultValue;
        });
        return initial;
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(formData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="apple-dialog sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-[var(--eai-primary)] mb-2">
                        <Info size={24} weight="duotone" />
                        <DialogTitle className="text-[20px] font-bold tracking-tight">
                            {config.title}
                        </DialogTitle>
                    </div>
                    <div className="text-[14px] text-[var(--eai-text-secondary)]">
                        {config.description}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {config.fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                            <Label className="text-[12px] font-bold tracking-wider text-[var(--eai-text-secondary)]">
                                {field.label} {field.required && <span className="text-[#FF3B30]">*</span>}
                            </Label>

                            {field.type === 'textarea' ? (
                                <Textarea
                                    placeholder={field.placeholder}
                                    className="min-h-[100px]"
                                    value={formData[field.key] || ''}
                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                    required={field.required}
                                />
                            ) : field.type === 'date' ? (
                                <div className="relative">
                                    <DatePicker
                                        date={formData[field.key] ? new Date(formData[field.key]) : undefined}
                                        onDateChange={(date) => {
                                            if (date) {
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                setFormData({ ...formData, [field.key]: `${year}-${month}-${day}` });
                                            } else {
                                                setFormData({ ...formData, [field.key]: '' });
                                            }
                                        }}
                                        allowFuture={true}
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        required={field.required}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="apple-button-secondary border-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="apple-button-primary shadow-lg shadow-[var(--eai-primary)]/20"
                        >
                            {config.buttonLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
