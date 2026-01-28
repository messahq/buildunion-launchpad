import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CertificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const mandatoryCerts = [
  {
    name: "Working at Heights",
    description: "Required for work 3 meters or more above ground. Must be renewed every 3 years.",
    provider: "Ministry of Labour approved providers",
    duration: "1 day",
    validity: "3 years"
  },
  {
    name: "WHMIS 2015",
    description: "Workplace Hazardous Materials Information System training for handling hazardous substances.",
    provider: "Various approved providers",
    duration: "Half day",
    validity: "Recommended annual refresh"
  },
  {
    name: "Health & Safety Awareness",
    description: "Basic occupational health and safety training required for all Ontario workers.",
    provider: "Employer or approved provider",
    duration: "Few hours",
    validity: "Once (but updates recommended)"
  }
];

const tradeCerts = [
  {
    trade: "Electrician",
    certs: [
      { name: "309A Construction & Maintenance", required: true },
      { name: "442A Industrial Electrician", required: false },
      { name: "ESA Certification", required: true }
    ]
  },
  {
    trade: "Plumber",
    certs: [
      { name: "306A Plumber Certificate", required: true },
      { name: "Backflow Prevention", required: false },
      { name: "Gas Fitter License (G1/G2)", required: false }
    ]
  },
  {
    trade: "HVAC Technician",
    certs: [
      { name: "313A Refrigeration & AC Mechanic", required: true },
      { name: "ODP Certificate", required: true },
      { name: "Gas Technician License", required: false }
    ]
  },
  {
    trade: "General Carpenter",
    certs: [
      { name: "403A General Carpenter", required: false },
      { name: "Scaffold Erector", required: false },
      { name: "Formwork Certification", required: false }
    ]
  }
];

const recommendedCerts = [
  {
    name: "First Aid & CPR",
    benefit: "Essential for emergency response, often required by employers"
  },
  {
    name: "Confined Space Entry",
    benefit: "Required for work in tanks, silos, sewers, and similar spaces"
  },
  {
    name: "Propane Handling",
    benefit: "Required for using propane-powered equipment on site"
  },
  {
    name: "Forklift/Telehandler",
    benefit: "Required for operating powered lift equipment"
  },
  {
    name: "Rigging & Signalling",
    benefit: "Required for crane operations and material hoisting"
  },
  {
    name: "Traffic Control",
    benefit: "Required for road work and traffic management"
  }
];

const CertificationsDialog = ({ isOpen, onClose }: CertificationsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-cyan-600" />
            Ontario Construction Certifications
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* Mandatory Certifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-foreground">Mandatory Certifications</h3>
              <Badge variant="destructive" className="text-xs">Required by Law</Badge>
            </div>
            <div className="space-y-3">
              {mandatoryCerts.map((cert, idx) => (
                <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{cert.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">Provider: {cert.provider}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {cert.duration}
                      </div>
                      <div className="text-xs font-medium text-amber-600 mt-1">
                        Valid: {cert.validity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade-Specific Certifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-foreground">Trade-Specific Certifications</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {tradeCerts.map((trade, idx) => (
                <div key={idx} className="p-4 bg-card rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-3">{trade.trade}</h4>
                  <ul className="space-y-2">
                    {trade.certs.map((cert, certIdx) => (
                      <li key={certIdx} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${cert.required ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-muted-foreground">{cert.name}</span>
                        {cert.required && (
                          <Badge variant="outline" className="text-xs ml-auto">Required</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Certifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-foreground">Recommended Certifications</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendedCerts.map((cert, idx) => (
                <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-sm text-foreground">{cert.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{cert.benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-amber-600">Track your certifications:</span> Use your BuildUnion profile to manage certification expiry dates and get renewal reminders.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificationsDialog;
