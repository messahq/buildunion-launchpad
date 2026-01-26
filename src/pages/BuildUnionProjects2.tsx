import { useState } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectQuestionnaire, { 
  ProjectAnswers, 
  WorkflowRecommendation 
} from "@/components/projects2/ProjectQuestionnaire";
import { toast } from "sonner";

const BuildUnionProjects2 = () => {
  const navigate = useNavigate();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [createdProjects, setCreatedProjects] = useState<Array<{
    answers: ProjectAnswers;
    workflow: WorkflowRecommendation;
    createdAt: Date;
  }>>([]);

  const handleQuestionnaireComplete = (answers: ProjectAnswers, workflow: WorkflowRecommendation) => {
    console.log("Project Created:", { answers, workflow });
    
    // Add to local state for now (later: save to database)
    setCreatedProjects(prev => [...prev, { 
      answers, 
      workflow, 
      createdAt: new Date() 
    }]);
    
    setShowQuestionnaire(false);
    toast.success(`Project "${answers.name}" created with ${workflow.mode} workflow!`);
  };

  return (
    <main className="bg-background min-h-screen transition-colors">
      <BuildUnionHeader />
      
      {/* Back Button */}
      <div className="container mx-auto px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/buildunion")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Main Content Area */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {!showQuestionnaire ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Projects</h1>
                    <p className="text-muted-foreground">Smart workflow based on your needs</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowQuestionnaire(true)}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </div>

              {/* Projects List or Empty State */}
              {createdProjects.length === 0 ? (
                <div className="min-h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground">No projects yet</p>
                    <p className="text-muted-foreground">Start by answering a few questions</p>
                  </div>
                  <Button 
                    onClick={() => setShowQuestionnaire(true)}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    New Project
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {createdProjects.map((project, index) => (
                    <div 
                      key={index}
                      className="p-6 rounded-xl border bg-card hover:border-amber-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{project.answers.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.answers.location} • {project.answers.workType?.replace("_", " ")} • {project.answers.size}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 capitalize">
                            {project.workflow.mode}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {project.workflow.estimatedSteps} steps
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {project.workflow.features.slice(0, 4).map((feature) => (
                          <span 
                            key={feature}
                            className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                        {project.workflow.features.length > 4 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                            +{project.workflow.features.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Questionnaire */
            <ProjectQuestionnaire
              onComplete={handleQuestionnaireComplete}
              onCancel={() => setShowQuestionnaire(false)}
            />
          )}
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjects2;
