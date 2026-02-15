import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile, TRADE_LABELS, EXPERIENCE_LABELS, ConstructionTrade, ExperienceLevel } from "@/hooks/useBuProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import NotificationSettings from "@/components/NotificationSettings";
import SecuritySettings from "@/components/SecuritySettings";
import { UnionSelector } from "@/components/UnionSelector";
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
  Trash2,
  AlertTriangle,
  Hash
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const BuildUnionProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, saving, updateProfile, ensureProfile } = useBuProfile();
  const { subscription } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

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
  const [hstNumber, setHstNumber] = useState("");
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
      setHstNumber((profile as any).hst_number || "");
      setCompanyLogoUrl(profile.company_logo_url || null);
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

  // Handle company logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    try {
      setUploadingLogo(true);

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/company-logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new logo URL
      await updateProfile({ company_logo_url: publicUrl } as any);
      setCompanyLogoUrl(publicUrl);
      toast.success('Company logo updated!');
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload company logo');
    } finally {
      setUploadingLogo(false);
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
      navigate('/buildunion/login');
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
      hst_number: hstNumber || null,
      bio: bio || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      availability,
      service_area: serviceArea || null,
      is_contractor: isContractor,
      is_union_member: isUnionMember,
      union_name: isUnionMember ? (unionName || null) : null,
      profile_completed: Boolean(primaryTrade && experienceLevel && phone)
    };
    
    await updateProfile(updates as any);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    
    try {
      setIsDeletingAccount(true);
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: "DELETE" }
      });

      if (error) throw error;

      toast.success('Account deleted successfully');
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
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
                  <Label htmlFor="hstNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    HST / Business Number
                  </Label>
                  <Input 
                    id="hstNumber"
                    placeholder="e.g. 123456789RT0001"
                    value={hstNumber}
                    onChange={(e) => setHstNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Your CRA Business Number (appears on contracts)</p>
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

              {/* Company Logo Upload */}
              <Separator className="my-4" />
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Logo
                  <Badge variant="secondary" className="text-xs">For PDF Quotes</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Upload your company logo to display it on PDF quotes and invoices.
                </p>
                <div className="flex items-center gap-4">
                  {companyLogoUrl ? (
                    <div className="relative group">
                      <img 
                        src={companyLogoUrl} 
                        alt="Company Logo" 
                        className="h-16 w-auto max-w-32 object-contain border rounded-lg p-1 bg-white"
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 text-white animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="gap-2"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Upload Logo
                    </Button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
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
                <div className="pl-6 border-l-2 border-amber-500/30">
                  <UnionSelector
                    value={unionName}
                    onChange={setUnionName}
                    primaryTrade={primaryTrade}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <NotificationSettings />

          {/* Security Settings */}
          <SecuritySettings />

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

          <Separator />

          {/* Danger Zone - Account Deletion */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions — please proceed with caution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you sure you want to delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>permanently delete</strong> your account and all associated data including:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>All projects, estimates, and contracts</li>
                <li>Team memberships and invitations</li>
                <li>Messages and forum posts</li>
                <li>Profile and uploaded files</li>
              </ul>
              <p className="font-medium text-destructive">
                This action is irreversible!
              </p>
              <div className="pt-2">
                <Label htmlFor="deleteConfirm" className="text-sm">
                  Type <strong>DELETE</strong> to confirm:
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete My Account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionProfile;
