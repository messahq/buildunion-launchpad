import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile, TRADE_LABELS, EXPERIENCE_LABELS } from "@/hooks/useBuProfile";
import { useSubscription } from "@/hooks/useSubscription";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Briefcase, 
  Phone, 
  Building2, 
  Globe, 
  MapPin, 
  DollarSign,
  Award,
  Loader2,
  CheckCircle,
  Clock,
  Users,
  Mail,
  Edit,
  Calendar,
  Star,
  Crown,
  Zap
} from "lucide-react";

const BuildUnionProfileView = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useBuProfile();
  const { subscription } = useSubscription();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'limited': return 'bg-yellow-500';
      case 'busy': return 'bg-orange-500';
      case 'not_available': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available': return 'Available Now';
      case 'limited': return 'Limited Availability';
      case 'busy': return 'Currently Busy';
      case 'not_available': return 'Not Available';
      default: return 'Unknown';
    }
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'BU';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header Card */}
        <Card className="relative overflow-hidden mb-6">
          {/* Cover gradient */}
          <div className="h-24 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          
          <CardContent className="pt-0 pb-6">
            {/* Avatar overlapping cover */}
            <div className="flex flex-col items-center -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'BuildUnion User'}
                  </h1>
                  {getTierBadge()}
                </div>
                
                {profile?.primary_trade && (
                  <p className="text-lg text-muted-foreground mt-1">
                    {TRADE_LABELS[profile.primary_trade]}
                  </p>
                )}

                {/* Availability badge */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`h-3 w-3 rounded-full ${getAvailabilityColor(profile?.availability || 'available')} animate-pulse`} />
                  <span className="text-sm font-medium">
                    {getAvailabilityText(profile?.availability || 'available')}
                  </span>
                </div>

                {/* Verification badges */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {profile?.is_verified && (
                    <Badge className="bg-blue-500 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {profile?.is_contractor && (
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      Contractor
                    </Badge>
                  )}
                  {profile?.is_union_member && (
                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                      <Users className="h-3 w-3" />
                      Union Member
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="absolute top-28 right-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/buildunion/profile')}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Sections */}
        <div className="space-y-4">
          {/* Bio */}
          {profile?.bio && (
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  About
                </h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Professional Info */}
          <Card>
            <CardContent className="py-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Professional Info
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {profile?.experience_level && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                    <p className="font-medium">{EXPERIENCE_LABELS[profile.experience_level]}</p>
                  </div>
                )}
                
                {profile?.experience_years !== undefined && profile.experience_years > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Years</p>
                    <p className="font-medium">{profile.experience_years} years</p>
                  </div>
                )}

                {profile?.hourly_rate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Hourly Rate</p>
                    <p className="font-medium text-green-600">${profile.hourly_rate}/hr CAD</p>
                  </div>
                )}

                {profile?.service_area && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Service Area</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.service_area}
                    </p>
                  </div>
                )}
              </div>

              {/* Secondary Trades */}
              {profile?.secondary_trades && profile.secondary_trades.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Additional Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.secondary_trades.map(trade => (
                      <Badge key={trade} variant="secondary">
                        {TRADE_LABELS[trade]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certifications */}
          {profile?.certifications && profile.certifications.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Certifications & Licenses
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map(cert => (
                    <Badge key={cert} variant="outline" className="gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Union Membership */}
          {profile?.is_union_member && profile?.union_name && (
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Union Membership
                </h3>
                <p className="text-muted-foreground">{profile.union_name}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contact
              </h3>
              
              {profile?.phone && (
                <a 
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-medium">{profile.phone}</span>
                </a>
              )}
              
              {user?.email && (
                <a 
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-medium">{user.email}</span>
                </a>
              )}

              {profile?.company_name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{profile.company_name}</span>
                </div>
              )}

              {profile?.company_website && (
                <a 
                  href={profile.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary underline">{profile.company_website}</span>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Member Since */}
          {profile?.created_at && (
            <div className="text-center text-sm text-muted-foreground py-4">
              <Calendar className="h-4 w-4 inline mr-1" />
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      </main>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionProfileView;
