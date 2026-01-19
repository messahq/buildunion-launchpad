import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile, TRADE_LABELS, EXPERIENCE_LABELS, ConstructionTrade, ExperienceLevel } from "@/hooks/useBuProfile";
import { useSubscription, SubscriptionTier, TEAM_LIMITS } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import NotificationSettings from "@/components/NotificationSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, 
  Briefcase, 
  Phone, 
  Building2, 
  Globe, 
  MapPin, 
  DollarSign,
  Award,
  Save,
  Loader2,
  X,
  Plus,
  CheckCircle,
  Users,
  Camera,
  Crown,
  Zap,
  ArrowLeft,
  Settings2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

// Dev tier options
const DEV_TIERS: { tier: SubscriptionTier; label: string; color: string }[] = [
  { tier: "free", label: "Free", color: "bg-slate-500" },
  { tier: "pro", label: "Pro", color: "bg-blue-500" },
  { tier: "premium", label: "Premium", color: "bg-purple-500" },
  { tier: "enterprise", label: "Enterprise", color: "bg-amber-500" },
];

const BuildUnionProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, saving, updateProfile, ensureProfile } = useBuProfile();
  const { subscription } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Secret dev mode state
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [currentDevTier, setCurrentDevTier] = useState<SubscriptionTier | null>(null);
  const isDev = import.meta.env.DEV;

  // Load dev tier override on mount
  useEffect(() => {
    const stored = localStorage.getItem("dev_tier_override");
    if (stored && DEV_TIERS.some(t => t.tier === stored)) {
      setCurrentDevTier(stored as SubscriptionTier);
    }
  }, []);

  const handleSecretClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 7) {
      setDevPanelOpen(true);
      toast.success("🔧 Dev Mode Unlocked!", { duration: 2000 });
    } else if (newCount >= 4) {
      toast.info(`${7 - newCount} more clicks...`, { duration: 1000 });
    }
  };

  const handleSetDevTier = (tier: SubscriptionTier) => {
    localStorage.setItem("dev_tier_override", tier);
    setCurrentDevTier(tier);
    toast.success(`Dev tier set to ${tier}`);
    setTimeout(() => window.location.reload(), 500);
  };

  const handleClearDevTier = () => {
    localStorage.removeItem("dev_tier_override");
    setCurrentDevTier(null);
    toast.success("Dev tier cleared");
    setTimeout(() => window.location.reload(), 500);
  };

  // Form state
  const [primaryTrade, setPrimaryTrade] = useState<ConstructionTrade | "">("");
  const [secondaryTrades, setSecondaryTrades] = useState<ConstructionTrade[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState("available");
  const [serviceArea, setServiceArea] = useState("");
  const [isContractor, setIsContractor] = useState(false);
  const [isUnionMember, setIsUnionMember] = useState(false);
  const [unionName, setUnionName] = useState("");

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setPrimaryTrade(profile.primary_trade || "");
      setSecondaryTrades(profile.secondary_trades || []);
      setExperienceLevel(profile.experience_level || "");
      setExperienceYears(profile.experience_years || 0);
      setCertifications(profile.certifications || []);
      setPhone(profile.phone || "");
      setCompanyName(profile.company_name || "");
      setCompanyWebsite(profile.company_website || "");
      setBio(profile.bio || "");
      setHourlyRate(profile.hourly_rate?.toString() || "");
      setAvailability(profile.availability || "available");
      setServiceArea(profile.service_area || "");
      setIsContractor(profile.is_contractor || false);
      setIsUnionMember(profile.is_union_member || false);
      setUnionName(profile.union_name || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });
      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getTierBadge = () => {
    if (subscription.tier === 'premium') {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
          <Crown className="h-3 w-3" />
          Premium
        </Badge>
      );
    } else if (subscription.tier === 'pro') {
      return (
        <Badge className="bg-blue-500 text-white gap-1">
          <Zap className="h-3 w-3" />
          Pro
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        Free
      </Badge>
    );
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'BU';

  // Ensure profile exists when page loads
  useEffect(() => {
    if (user && !authLoading && !profileLoading && !profile) {
      ensureProfile();
    }
  }, [user, authLoading, profileLoading, profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    const updates = {
      primary_trade: primaryTrade || null,
      secondary_trades: secondaryTrades,
      experience_level: experienceLevel || null,
      experience_years: experienceYears,
      certifications,
      phone: phone || null,
      company_name: companyName || null,
      company_website: companyWebsite || null,
      bio: bio || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      availability,
      service_area: serviceArea || null,
      is_contractor: isContractor,
      is_union_member: isUnionMember,
      union_name: isUnionMember ? (unionName || null) : null,
      profile_completed: Boolean(primaryTrade && experienceLevel && phone)
    };
    
    await updateProfile(updates);
  };

  const addSecondaryTrade = (trade: ConstructionTrade) => {
    if (!secondaryTrades.includes(trade) && trade !== primaryTrade) {
      setSecondaryTrades([...secondaryTrades, trade]);
    }
  };

  const removeSecondaryTrade = (trade: ConstructionTrade) => {
    setSecondaryTrades(secondaryTrades.filter(t => t !== trade));
  };

  const addCertification = () => {
    if (newCertification.trim() && !certifications.includes(newCertification.trim())) {
      setCertifications([...certifications, newCertification.trim()]);
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    setCertifications(certifications.filter(c => c !== cert));
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isProfileComplete = Boolean(primaryTrade && experienceLevel && phone);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/buildunion/workspace")}
          className="gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workspace
        </Button>

        {/* Profile Header with Avatar and Tier */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          <CardContent className="pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 -mt-10">
              {/* Avatar with upload */}
              <div className="relative group">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* User info */}
              <div className="flex-1 text-center sm:text-left mt-2 sm:mt-6">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'BuildUnion User'}
                  </h1>
                  {getTierBadge()}
                </div>
                <p className="text-muted-foreground">
                  Complete your professional profile to access the construction marketplace
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isProfileComplete && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Complete your profile (trade, experience, phone) to unlock all marketplace features
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isProfileComplete && (
          <Card className="mb-6 border-green-500/50 bg-green-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your profile is complete! You have full access to the marketplace.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Professional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>Your trade and experience details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryTrade">Primary Trade *</Label>
                  <Select value={primaryTrade} onValueChange={(v) => setPrimaryTrade(v as ConstructionTrade)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your main trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRADE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level *</Label>
                  <Select value={experienceLevel} onValueChange={(v) => setExperienceLevel(v as ExperienceLevel)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input 
                  type="number" 
                  min={0} 
                  max={50}
                  value={experienceYears} 
                  onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                  className="max-w-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Secondary Trades</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {secondaryTrades.map(trade => (
                    <Badge key={trade} variant="secondary" className="gap-1">
                      {TRADE_LABELS[trade]}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSecondaryTrade(trade)}
                      />
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(v) => addSecondaryTrade(v as ConstructionTrade)}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Add secondary trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRADE_LABELS)
                      .filter(([value]) => value !== primaryTrade && !secondaryTrades.includes(value as ConstructionTrade))
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <Switch 
                  checked={isContractor} 
                  onCheckedChange={setIsContractor}
                  id="isContractor"
                />
                <Label htmlFor="isContractor">I am a contractor (I hire workers for projects)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications & Licenses
              </CardTitle>
              <CardDescription>Your professional credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {certifications.map(cert => (
                  <Badge key={cert} variant="outline" className="gap-1">
                    {cert}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeCertification(cert)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., Red Seal, OSHA 30, Master Electrician"
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCertification()}
                  className="max-w-sm"
                />
                <Button variant="outline" size="icon" onClick={addCertification}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Company */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contact & Company
              </CardTitle>
              <CardDescription>How clients can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number *
                  </Label>
                  <Input 
                    id="phone"
                    type="tel"
                    placeholder="+1 (416) 555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input 
                    id="companyName"
                    placeholder="Your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input 
                    id="companyWebsite"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceArea" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Area
                  </Label>
                  <Input 
                    id="serviceArea"
                    placeholder="e.g., Greater Toronto Area"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rates & Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rates & Availability
              </CardTitle>
              <CardDescription>Your pricing and current status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (CAD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="hourlyRate"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="75.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability Status</Label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available Now</SelectItem>
                      <SelectItem value="busy">Currently Busy</SelectItem>
                      <SelectItem value="limited">Limited Availability</SelectItem>
                      <SelectItem value="not_available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                About You
              </CardTitle>
              <CardDescription>Tell potential clients about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Describe your experience, specialties, and what sets you apart..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Union Membership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Union Membership
              </CardTitle>
              <CardDescription>Your trade union affiliation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch 
                  checked={isUnionMember} 
                  onCheckedChange={setIsUnionMember}
                  id="isUnionMember"
                />
                <Label htmlFor="isUnionMember">I am a union member</Label>
              </div>

              {isUnionMember && (
                <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                  <Label htmlFor="unionName">Union Name</Label>
                  <Input 
                    id="unionName"
                    placeholder="e.g., IBEW Local 353, Carpenters Union Local 27"
                    value={unionName}
                    onChange={(e) => setUnionName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the name of your trade union or local chapter
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <NotificationSettings />

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/buildunion')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>

          {/* Secret Dev Mode Panel - Hidden at the very bottom */}
          {isDev && (
            <div className="mt-12 pt-8 border-t border-dashed border-slate-200">
              <Collapsible open={devPanelOpen} onOpenChange={setDevPanelOpen}>
                <CollapsibleTrigger asChild>
                  <div 
                    className="flex items-center justify-center cursor-pointer select-none"
                    onClick={(e) => {
                      if (!devPanelOpen) {
                        e.preventDefault();
                        handleSecretClick();
                      }
                    }}
                  >
                    <span className="text-[10px] text-slate-300 hover:text-slate-400 transition-colors">
                      {devPanelOpen ? "🔧 Dev Mode Active" : "・・・"}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card className="bg-slate-900 text-white border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Settings2 className="h-4 w-4 text-amber-400" />
                        Secret Dev Tier Tester
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs">
                        Override subscription tier for testing. Page will reload.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {DEV_TIERS.map(({ tier, label, color }) => (
                          <button
                            key={tier}
                            onClick={() => handleSetDevTier(tier)}
                            className={`
                              px-3 py-2 rounded-lg text-sm font-medium transition-all
                              ${currentDevTier === tier 
                                ? `${color} text-white ring-2 ring-white/30` 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }
                            `}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{label}</span>
                              {tier !== "free" && <Sparkles className="h-3 w-3" />}
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">
                              <Users className="h-3 w-3 inline mr-1" />
                              {TEAM_LIMITS[tier] === Infinity ? "∞" : TEAM_LIMITS[tier]} members
                            </div>
                          </button>
                        ))}
                      </div>

                      {currentDevTier && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearDevTier}
                          className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Clear Override (Use Real Tier)
                        </Button>
                      )}

                      <p className="text-[10px] text-slate-500 text-center">
                        🤫 This panel is only visible in development mode
                      </p>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </main>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionProfile;
