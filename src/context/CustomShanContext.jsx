import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { customShanStore } from "@/lib/localDataStore";

const CustomShanContext = createContext(null);

const normalizeIconUrl = (iconUrl) => {
  if (!iconUrl || typeof iconUrl !== "string") {
    return null;
  }

  try {
    const parsed = new URL(iconUrl);
    if (
      typeof window !== "undefined" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      parsed.hostname = window.location.hostname;
      return parsed.toString();
    }
    return parsed.toString();
  } catch (err) {
    return iconUrl;
  }
};

const normalizeCustomShan = (customShan) => {
  if (!customShan) {
    return customShan;
  }

  const rawIconUrl =
    customShan.icon_url ||
    customShan.iconUrl ||
    customShan.icon ||
    customShan.avatar_url ||
    customShan.avatarUrl;

  return {
    ...customShan,
    icon_url: normalizeIconUrl(rawIconUrl),
  };
};

export function CustomShanProvider({ children }) {
  const { user } = useAuth();
  const [customShans, setCustomShans] = useState([]);
  const [publicCustomShans, setPublicCustomShans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCustomShan, setActiveCustomShan] = useState(null);

  // Fetch all custom shans for the user
  const fetchCustomShans = useCallback(async () => {
    if (!user) {
      setCustomShans([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await customShanStore.list(user.uid);
      const normalized = (data || []).map(normalizeCustomShan);
      setCustomShans(normalized);
    } catch (err) {
      console.error("Error fetching custom shans:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch a specific custom shan by ID
  const fetchCustomShan = useCallback(
    async (id) => {
      if (!user || !id) {
        return null;
      }

      try {
        const data = await customShanStore.get(user.uid, id);
        return normalizeCustomShan(data);
      } catch (err) {
        console.error("Error fetching custom shan:", err);
        throw err;
      }
    },
    [user]
  );

  // Create a new custom shan
  const createCustomShan = useCallback(
    async ({ name, description, systemPrompt, starterPrompt, knowledgeFile, iconFile }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await customShanStore.create(user, {
          name,
          description,
          systemPrompt,
          starterPrompt,
          knowledgeFile,
          iconFile,
        });

        // Refresh the list
        await fetchCustomShans();

        return data;
      } catch (err) {
        console.error("Error creating custom shan:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchCustomShans]
  );

  // Update an existing custom shan
  const updateCustomShan = useCallback(
    async (id, updates) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }

      try {
        const data = await customShanStore.update(user, id, updates || {});

        // Refresh the list
        await fetchCustomShans();

        return data;
      } catch (err) {
        console.error("Error updating custom shan:", err);
        throw err;
      }
    },
    [user, fetchCustomShans]
  );

  // Delete a custom shan
  const deleteCustomShan = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }

      try {
        await customShanStore.remove(user, id);

        // Clear active if deleted
        if (activeCustomShan?.id === id) {
          setActiveCustomShan(null);
        }

        // Refresh the list
        await fetchCustomShans();

        return true;
      } catch (err) {
        console.error("Error deleting custom shan:", err);
        throw err;
      }
    },
    [user, activeCustomShan, fetchCustomShans]
  );

  // Fetch public custom shans for discovery
  const fetchPublicCustomShans = useCallback(async () => {
    if (!user) {
      setPublicCustomShans([]);
      return;
    }

    try {
      const data = await customShanStore.listPublic(user.uid);
      const normalized = (data || []).map(normalizeCustomShan);
      setPublicCustomShans(normalized);
    } catch (err) {
      console.error("Error fetching public custom shans:", err);
    }
  }, [user]);

  // Toggle public visibility of a custom shan
  const togglePublic = useCallback(
    async (id) => {
      if (!user || !id) {
        throw new Error("User not authenticated or missing ID");
      }

      try {
        const data = await customShanStore.togglePublic(user, id);

        // Refresh the list
        await fetchCustomShans();

        return data;
      } catch (err) {
        console.error("Error toggling public status:", err);
        throw err;
      }
    },
    [user, fetchCustomShans]
  );

  // Select a custom shan as active for chat
  const selectCustomShan = useCallback(
    async (id) => {
      if (!id) {
        setActiveCustomShan(null);
        return null;
      }

      try {
        const customShan = await fetchCustomShan(id);
        setActiveCustomShan(customShan);
        return customShan;
      } catch (err) {
        console.error("Error selecting custom shan:", err);
        setActiveCustomShan(null);
        throw err;
      }
    },
    [fetchCustomShan]
  );

  // Clear active custom shan
  const clearActiveCustomShan = useCallback(() => {
    setActiveCustomShan(null);
  }, []);

  // Fetch custom shans when user logs in
  useEffect(() => {
    if (user) {
      fetchCustomShans();
    } else {
      setCustomShans([]);
      setActiveCustomShan(null);
    }
  }, [user, fetchCustomShans]);

  const value = {
    customShans,
    publicCustomShans,
    isLoading,
    error,
    activeCustomShan,
    fetchCustomShans,
    fetchPublicCustomShans,
    fetchCustomShan,
    createCustomShan,
    updateCustomShan,
    deleteCustomShan,
    togglePublic,
    selectCustomShan,
    clearActiveCustomShan,
  };

  return (
    <CustomShanContext.Provider value={value}>
      {children}
    </CustomShanContext.Provider>
  );
}

export function useCustomShan() {
  const context = useContext(CustomShanContext);
  if (!context) {
    throw new Error("useCustomShan must be used within a CustomShanProvider");
  }
  return context;
}

export default CustomShanContext;
