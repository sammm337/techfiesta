import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Map from "./Map";

const incidentTypes = [
  "Harassment",
  "Stalking",
  "Suspicious Activity",
  "Unsafe Environment",
  "Other",
];

const IncidentForm = () => {
  const navigate = useNavigate();
  const { user, supabase } = useAuth();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to submit a report");
      navigate("/login");
      return;
    }

    if (!selectedType) {
      toast.error("Please select an incident type");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description of the incident");
      return;
    }

    setIsSubmitting(true);
    try {
      // Handle the file upload if provided
      let evidenceUrl = null;
      if (evidence) {
        const fileExt = evidence.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, evidence);

        if (uploadError) {
          throw new Error(`Error uploading evidence: ${uploadError.message}`);
        }
        evidenceUrl = fileData?.path || null;
      }

      // Insert the incident record
      const { error: insertError } = await supabase
        .from('incidents')
        .insert([
          {
            user_id: isAnonymous ? null : user.id,
            type: selectedType,
            description: description.trim(),
            location,
            evidence_url: evidenceUrl,
            status: "pending",
            reported_at: new Date().toISOString(),
            is_anonymous: isAnonymous,
          },
        ]);

      if (insertError) throw insertError;

      toast.success("Incident reported successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error submitting incident:", error);
      toast.error(error.message || "Failed to submit incident. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size should be less than 5MB");
        return;
      }
      setEvidence(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="space-y-2">
        <Label>Type of Incident</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {incidentTypes.map((type) => (
            <Button
              key={type}
              type="button"
              variant={selectedType === type ? "default" : "outline"}
              onClick={() => setSelectedType(type)}
              className="justify-start"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <div className="h-[200px] rounded-md overflow-hidden">
          <Map onLocationSelect={(loc) => setLocation(loc)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Please describe what happened..."
          className="min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Evidence (Optional)</Label>
        <Input 
          type="file" 
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        <p className="text-xs text-gray-500">Maximum file size: 5MB</p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={isAnonymous}
          onCheckedChange={setIsAnonymous}
          id="anonymous"
        />
        <Label htmlFor="anonymous">Report Anonymously</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Report"}
      </Button>
    </form>
  );
};

export default IncidentForm;