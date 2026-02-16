import { ArrowLeft, Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const BuildUnionContact = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-form", {
        body: formData,
      });
      if (error) throw error;
      toast.success("Message sent! We'll get back to you within 48 hours.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Failed to send message. Please try again or email us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-light tracking-tight mb-3">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </h2>
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">Get in Touch</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have questions about BuildUnion? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Card className="border-border hover:border-amber-500/30 transition-colors">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="p-2.5 rounded-xl shrink-0 bg-amber-500/10 text-amber-500">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">Email</h3>
                <p className="text-xs text-muted-foreground">admin@buildunion.ca</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border hover:border-amber-500/30 transition-colors">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="p-2.5 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-500">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">Location</h3>
                <p className="text-xs text-muted-foreground">Toronto, Ontario, Canada</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border hover:border-amber-500/30 transition-colors">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="p-2.5 rounded-xl shrink-0 bg-sky-500/10 text-sky-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">Response Time</h3>
                <p className="text-xs text-muted-foreground">Within 48 hours</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="What's this about?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us more..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionContact;
