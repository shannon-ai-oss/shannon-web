import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { projectStore } from "@/lib/localDataStore";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [activeProjectFiles, setActiveProjectFiles] = useState([]);

  // Fetch all projects for the user
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await projectStore.list(user.uid);
      setProjects(data || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch a specific project by ID with files
  const fetchProject = useCallback(
    async (id) => {
      if (!user || !id) {
        return null;
      }

      try {
        return await projectStore.get(user.uid, id);
      } catch (err) {
        console.error("Error fetching project:", err);
        throw err;
      }
    },
    [user]
  );

  // Create a new project
  const createProject = useCallback(
    async ({ name, description, icon, instructions }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await projectStore.create(user, {
          name,
          description,
          icon,
          instructions,
        });

        // Refresh the list
        await fetchProjects();

        return data;
      } catch (err) {
        console.error("Error creating project:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchProjects]
  );

  // Update an existing project
  const updateProject = useCallback(
    async (id, updates) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }

      try {
        const data = await projectStore.update(user, id, updates);

        // Refresh the list
        await fetchProjects();

        return data;
      } catch (err) {
        console.error("Error updating project:", err);
        throw err;
      }
    },
    [user, fetchProjects]
  );

  // Delete a project
  const deleteProject = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }

      try {
        await projectStore.remove(user, id);

        // Clear active if deleted
        if (activeProject?.id === id) {
          setActiveProject(null);
          setActiveProjectFiles([]);
        }

        // Refresh the list
        await fetchProjects();

        return true;
      } catch (err) {
        console.error("Error deleting project:", err);
        throw err;
      }
    },
    [user, activeProject, fetchProjects]
  );

  // Upload a file to a project
  const uploadFile = useCallback(
    async (projectId, file) => {
      if (!user || !projectId || !file) {
        throw new Error("Missing required parameters");
      }

      try {
        const data = await projectStore.uploadFile(user, projectId, file);

        // Refresh project files if this is the active project
        if (activeProject?.id === projectId) {
          const updated = await fetchProject(projectId);
          setActiveProjectFiles(updated?.files || []);
        }

        // Refresh projects list to update file counts
        await fetchProjects();

        return data;
      } catch (err) {
        console.error("Error uploading file:", err);
        throw err;
      }
    },
    [user, activeProject, fetchProject, fetchProjects]
  );

  // Delete a file from a project
  const deleteFile = useCallback(
    async (projectId, fileId) => {
      if (!user || !projectId || !fileId) {
        throw new Error("Missing required parameters");
      }

      try {
        await projectStore.deleteFile(user, projectId, fileId);

        // Refresh project files if this is the active project
        if (activeProject?.id === projectId) {
          const updated = await fetchProject(projectId);
          setActiveProjectFiles(updated?.files || []);
        }

        // Refresh projects list
        await fetchProjects();

        return true;
      } catch (err) {
        console.error("Error deleting file:", err);
        throw err;
      }
    },
    [user, activeProject, fetchProject, fetchProjects]
  );

  // Get download URL for a file
  const getFileDownloadUrl = useCallback(
    async (projectId, fileId) => {
      if (!user || !projectId || !fileId) {
        throw new Error("Missing required parameters");
      }

      try {
        return await projectStore.getDownloadUrl(user, projectId, fileId);
      } catch (err) {
        console.error("Error getting download URL:", err);
        throw err;
      }
    },
    [user]
  );

  // Search files in a project
  const searchProjectFiles = useCallback(
    async (projectId, query) => {
      if (!user || !projectId || !query) {
        return { results: [] };
      }

      try {
        return await projectStore.searchFiles(user, projectId, query);
      } catch (err) {
        console.error("Error searching files:", err);
        throw err;
      }
    },
    [user]
  );

  // Select a project as active for chat
  const selectProject = useCallback(
    async (id) => {
      if (!id) {
        setActiveProject(null);
        setActiveProjectFiles([]);
        return null;
      }

      try {
        const project = await fetchProject(id);
        setActiveProject(project);
        setActiveProjectFiles(project?.files || []);
        return project;
      } catch (err) {
        console.error("Error selecting project:", err);
        setActiveProject(null);
        setActiveProjectFiles([]);
        throw err;
      }
    },
    [fetchProject]
  );

  // Clear active project
  const clearActiveProject = useCallback(() => {
    setActiveProject(null);
    setActiveProjectFiles([]);
  }, []);

  // Fetch projects when user logs in
  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
      setActiveProject(null);
      setActiveProjectFiles([]);
    }
  }, [user, fetchProjects]);

  const value = {
    projects,
    isLoading,
    error,
    activeProject,
    activeProjectFiles,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    uploadFile,
    deleteFile,
    getFileDownloadUrl,
    searchProjectFiles,
    selectProject,
    clearActiveProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

export default ProjectContext;
