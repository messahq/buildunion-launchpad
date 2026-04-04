// ============================================
// ContractEmailDialog — Multi-recipient contract email sender
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, Plus, X, Check, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
}

interface ContractForEmail {
  id: string;
  contract_number: string;
  share_token?: string;
  total_amount?: number | null;
  status?: string;
}

interface ContractEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContract: ContractForEmail | null;
  contractRecipients: { email: string; name: string }[];
  setContractRecipients: React.Dispatch<React.SetStateAction<{ email: string; name: string }[]>>;
  teamMembers: TeamMember[];
  isSendingToMultiple: boolean;
  onSend: () => void;
}

export function ContractEmailDialog({
  open,
  onOpenChange,
  selectedContract,
  contractRecipients,
  setContractRecipients,
  teamMembers,
  isSendingToMultiple,
  onSend,
}: ContractEmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-pink-500" />
            Send Contract to Multiple Recipients
          </DialogTitle>
        </DialogHeader>

        {selectedContract && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium">#{selectedContract.contract_number}</p>
              {selectedContract.total_amount && (
                <p className="text-lg font-bold text-pink-600">
                  ${selectedContract.total_amount.toLocaleString()}
                </p>
              )}
            </div>

            {/* Team Members Quick Select */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick Add Team Members</p>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map(member => {
                    const isSelected = contractRecipients.some(r =>
                      r.name === member.name && r.email
                    );
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          if (isSelected) {
                            setContractRecipients(prev => prev.filter(r => r.name !== member.name));
                          } else {
                            setContractRecipients(prev => {
                              const hasEmpty = prev.some(r => !r.email && !r.name);
                              if (hasEmpty) {
                                return prev.map(r => (!r.email && !r.name) ? { name: member.name, email: '' } : r);
                              }
                              return [...prev, { name: member.name, email: '' }];
                            });
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-all",
                          isSelected
                            ? "bg-pink-100 border-pink-400 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300"
                            : "bg-muted/50 border-muted-foreground/20 hover:border-pink-400"
                        )}
                      >
                        <div className="h-4 w-4 rounded-full bg-pink-500 flex items-center justify-center text-white text-[8px] font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        {member.name}
                        <Badge variant="outline" className="text-[8px] h-4 px-1">{member.role}</Badge>
                        {isSelected && <Check className="h-3 w-3 text-pink-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Recipients</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setContractRecipients(prev => [...prev, { email: '', name: '' }])}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {contractRecipients.map((recipient, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Name"
                    value={recipient.name}
                    onChange={(e) => {
                      const newRecipients = [...contractRecipients];
                      newRecipients[idx].name = e.target.value;
                      setContractRecipients(newRecipients);
                    }}
                    className="w-28 h-9 text-sm"
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={recipient.email}
                    onChange={(e) => {
                      const newRecipients = [...contractRecipients];
                      newRecipients[idx].email = e.target.value;
                      setContractRecipients(newRecipients);
                    }}
                    className="flex-1 h-9 text-sm"
                  />
                  {contractRecipients.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => {
                        setContractRecipients(prev => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSend}
            disabled={isSendingToMultiple || contractRecipients.every(r => !r.email)}
            className="gap-2 bg-pink-600 hover:bg-pink-700"
          >
            {isSendingToMultiple ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send to {contractRecipients.filter(r => r.email).length} Recipient{contractRecipients.filter(r => r.email).length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}