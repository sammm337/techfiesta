import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import IncidentCard from '@/components/IncidentCard';
import EditIncidentDialog from '@/components/EditIncidentDialog';

type Incident = {
  id: string;
  reported_at: string;
  status: string;
  type: string;
  description: string;
  location: string | null;
  log: string | null;  // Added this line to match the IncidentCard props type
};

const Dashboard = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statistics, setStatistics] = useState<any[]>([]);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchIncidents = async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, reported_at, type, description, status, location, log')  // Added log to the select query
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching incidents:', error);
        return;
      }

      setIncidents(data || []);

      const stats = data?.reduce((acc: any, incident: Incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {});

      const formattedStats = Object.entries(stats || {}).map(([name, value]) => ({
        name,
        value,
      }));

      setStatistics(formattedStats);
    };

    fetchIncidents();
  }, [user]);

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setEditDescription(incident.description);
    setEditLocation(incident.location || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingIncident) return;

    // First get the current incident to access its log
    const { data: currentIncident, error: fetchError } = await supabase
      .from('incidents')
      .select('log')
      .eq('id', editingIncident.id)
      .single();

    if (fetchError) {
      console.error('Error fetching incident:', fetchError);
      toast.error('Failed to update incident');
      return;
    }

    const timestamp = new Date().toISOString();
    const changes = [];
    
    if (editingIncident.description !== editDescription) {
      changes.push('description');
    }
    if (editingIncident.location !== editLocation) {
      changes.push('location');
    }

    const newLogEntry = `[${timestamp}] User edited ${changes.join(' and ')}. Status set to pending\n`;
    const updatedLog = currentIncident.log 
      ? `${currentIncident.log}${newLogEntry}`
      : newLogEntry;

    const { error } = await supabase
      .from('incidents')
      .update({
        description: editDescription.trim(),
        location: editLocation.trim() || null,
        status: 'pending',
        log: updatedLog
      })
      .eq('id', editingIncident.id)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error updating incident:', error);
      toast.error('Failed to update incident');
      return;
    }

    // Update local state
    setIncidents(incidents.map(incident => 
      incident.id === editingIncident.id 
        ? { 
            ...incident, 
            description: editDescription, 
            location: editLocation,
            status: 'pending',
            log: updatedLog
          }
        : incident
    ));

    toast.success('Incident updated successfully');
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="incidents">My Reported Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Statistics</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer
                  config={{
                    value: {
                      theme: {
                        light: "#2563eb",
                        dark: "#3b82f6"
                      }
                    }
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statistics}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="value" fill="var(--color-value)" />
                      <Tooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <EditIncidentDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          description={editDescription}
          setDescription={setEditDescription}
          location={editLocation}
          setLocation={setEditLocation}
          onSave={handleSave}
        />
      </main>
    </div>
  );
};

export default Dashboard;