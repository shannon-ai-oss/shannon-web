import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { skillsStore } from "@/lib/localDataStore";

const SkillsContext = createContext(null);

export function SkillsProvider({ children }) {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [publicSkills, setPublicSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSkills = useCallback(async () => {
    if (!user) {
      setSkills([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await skillsStore.list(user.uid);
      setSkills(data || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchSkill = useCallback(
    async (id) => {
      if (!user || !id) {
        return null;
      }
      return await skillsStore.get(user.uid, id);
    },
    [user],
  );

  const createSkill = useCallback(
    async ({ name, description, content }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await skillsStore.create(user, {
          name,
          description,
          content,
        });
        await fetchSkills();
        return data;
      } catch (err) {
        console.error("Error creating skill:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchSkills],
  );

  const updateSkill = useCallback(
    async (id, updates) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }
      try {
        const data = await skillsStore.update(user, id, updates);
        await fetchSkills();
        return data;
      } catch (err) {
        console.error("Error updating skill:", err);
        throw err;
      }
    },
    [user, fetchSkills],
  );

  const deleteSkill = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }
      try {
        await skillsStore.remove(user, id);
        await fetchSkills();
        return true;
      } catch (err) {
        console.error("Error deleting skill:", err);
        throw err;
      }
    },
    [user, fetchSkills],
  );

  const togglePublic = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }
      try {
        const data = await skillsStore.togglePublic(user, id);
        await fetchSkills();
        return data;
      } catch (err) {
        console.error("Error toggling public status:", err);
        throw err;
      }
    },
    [user, fetchSkills],
  );

  const fetchPublicSkills = useCallback(async () => {
    if (!user) {
      setPublicSkills([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await skillsStore.listPublic(user.uid);
      setPublicSkills(data || []);
    } catch (err) {
      console.error("Error fetching public skills:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const cloneSkill = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }
      try {
        const data = await skillsStore.clone(user, id);
        await fetchSkills();
        return data;
      } catch (err) {
        console.error("Error cloning skill:", err);
        throw err;
      }
    },
    [user, fetchSkills],
  );

  useEffect(() => {
    if (user) {
      fetchSkills();
    } else {
      setSkills([]);
      setPublicSkills([]);
    }
  }, [user, fetchSkills]);

  const value = {
    skills,
    publicSkills,
    isLoading,
    error,
    fetchSkills,
    fetchSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    togglePublic,
    fetchPublicSkills,
    cloneSkill,
  };

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  );
}

export function useSkills() {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error("useSkills must be used within a SkillsProvider");
  }
  return context;
}

export default SkillsContext;
