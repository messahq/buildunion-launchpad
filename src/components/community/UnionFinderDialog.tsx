import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Phone, 
  Mail, 
  ExternalLink,
  Users,
  Shield,
  DollarSign,
  Heart,
  GraduationCap
} from "lucide-react";

interface UnionFinderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock union data - can be replaced with real database later
const mockUnions = [
  {
    id: "1",
    name: "IBEW Local 353",
    fullName: "International Brotherhood of Electrical Workers",
    trade: "electrician",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 967-7353",
    email: "info@ibew353.org",
    website: "https://ibew353.org",
    memberCount: 12000,
    benefits: ["Health Insurance", "Pension Plan", "Training Programs", "Job Placement"],
    description: "Representing electrical workers across the GTA since 1903.",
  },
  {
    id: "2",
    name: "UA Local 46",
    fullName: "United Association of Plumbers and Pipefitters",
    trade: "plumber",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 759-9351",
    email: "info@ualocal46.org",
    website: "https://ualocal46.org",
    memberCount: 8500,
    benefits: ["Health Benefits", "Retirement Security", "Apprenticeship", "Safety Training"],
    description: "Ontario's largest plumbers and pipefitters union.",
  },
  {
    id: "3",
    name: "Carpenters Local 27",
    fullName: "United Brotherhood of Carpenters and Joiners",
    trade: "carpenter",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 679-8007",
    email: "info@thecarpentersunion.ca",
    website: "https://thecarpentersunion.ca",
    memberCount: 15000,
    benefits: ["Comprehensive Benefits", "Training Centre", "Pension", "Job Security"],
    description: "Building Ontario's future with skilled carpenters.",
  },
  {
    id: "4",
    name: "LiUNA Local 183",
    fullName: "Laborers' International Union of North America",
    trade: "general_contractor",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 506-8400",
    email: "info@liuna183.com",
    website: "https://liuna183.com",
    memberCount: 55000,
    benefits: ["Health & Welfare", "Pension", "Training", "Legal Services"],
    description: "Canada's largest construction local union.",
  },
  {
    id: "5",
    name: "Ironworkers Local 721",
    fullName: "International Association of Bridge, Structural, Ornamental and Reinforcing Iron Workers",
    trade: "welder",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 751-5765",
    email: "info@ironworkers721.org",
    website: "https://ironworkers721.org",
    memberCount: 3500,
    benefits: ["Insurance Benefits", "Annuity", "Apprenticeship", "Upgrading Courses"],
    description: "Skilled ironworkers building Toronto's skyline.",
  },
  {
    id: "6",
    name: "Sheet Metal Workers Local 30",
    fullName: "International Association of Sheet Metal, Air, Rail and Transportation Workers",
    trade: "hvac_technician",
    location: "Toronto, ON",
    region: "Greater Toronto Area",
    phone: "(416) 493-1852",
    email: "info@smwlocal30.ca",
    website: "https://smwlocal30.ca",
    memberCount: 2800,
    benefits: ["Health Plan", "Pension", "HVAC Training", "Certification Support"],
    description: "Excellence in sheet metal and HVAC work.",
  },
];

const trades = [
  { value: "all", label: "All Trades" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "carpenter", label: "Carpenter" },
  { value: "mason", label: "Mason" },
  { value: "roofer", label: "Roofer" },
  { value: "hvac_technician", label: "HVAC Technician" },
  { value: "painter", label: "Painter" },
  { value: "welder", label: "Welder" },
  { value: "heavy_equipment_operator", label: "Heavy Equipment Operator" },
  { value: "concrete_worker", label: "Concrete Worker" },
  { value: "drywall_installer", label: "Drywall Installer" },
  { value: "flooring_specialist", label: "Flooring Specialist" },
];

const regions = [
  { value: "all", label: "All Regions" },
  { value: "Greater Toronto Area", label: "Greater Toronto Area" },
  { value: "Ottawa", label: "Ottawa" },
  { value: "Hamilton", label: "Hamilton" },
  { value: "London", label: "London" },
  { value: "Windsor", label: "Windsor" },
  { value: "Kitchener-Waterloo", label: "Kitchener-Waterloo" },
];

const UnionFinderDialog = ({ isOpen, onClose }: UnionFinderDialogProps) => {
  const { t } = useTranslation();
  const [selectedTrade, setSelectedTrade] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUnions = mockUnions.filter((union) => {
    const matchesTrade = selectedTrade === "all" || union.trade === selectedTrade;
    const matchesRegion = selectedRegion === "all" || union.region === selectedRegion;
    const matchesSearch = searchQuery === "" || 
      union.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      union.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTrade && matchesRegion && matchesSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-600" />
            Find Your Local Union
          </DialogTitle>
          <DialogDescription>
            Connect with trade unions in your area. Get access to better wages, benefits, training, and job security.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Filters */}
        <div className="grid md:grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search unions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Trade</Label>
            <Select value={selectedTrade} onValueChange={setSelectedTrade}>
              <SelectTrigger>
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent>
                {trades.map((trade) => (
                  <SelectItem key={trade.value} value={trade.value}>
                    {trade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Region</Label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Why Join a Union */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            Why Join a Union?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>+27% Higher Wages</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Health Coverage</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Job Security</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-purple-600" />
              <span>Free Training</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredUnions.length} union{filteredUnions.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {filteredUnions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No unions found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search filters or check back later.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUnions.map((union) => (
                <Card key={union.id} className="hover:border-amber-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {union.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{union.fullName}</p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {union.memberCount.toLocaleString()} members
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{union.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {union.benefits.map((benefit, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {union.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {union.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {union.email}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => window.open(union.website, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Website
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `mailto:${union.email}?subject=Membership Inquiry`}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-muted/50 rounded-lg p-4 mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Can't find your union? We're constantly adding new partners.
          </p>
          <Button variant="link" className="text-amber-600" onClick={onClose}>
            Let us know which union you're looking for
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnionFinderDialog;
