import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { showError, showSuccess } from "../../global/functions";
import { useAuth } from "../../global/context";
import { PrayerListDetail, PrayerFormModal } from "./lists";
import { churchPrayersApi } from "./churchPrayersApi";

/**
 * Lista de rugaciune a bisericii (tabul BISERICA): o singura lista globala,
 * vizibila tuturor. Butonul de adaugare si actiunile pe motive apar doar celor cu
 * capabilitatea church_prayers.manage; restul o vad read-only. Refoloseste
 * PrayerListDetail ca sa fie unitar cu tabul Rugaciuni.
 */
export const ChurchListView = ({ currentUserId, fabBottom = 28 }) => {
  const { can } = useAuth();
  const canManage = can("church_prayers.manage", "edit");

  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await churchPrayersApi.list();
      setPrayers(data || []);
    } catch (e) {
      showError("Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitPrayer = async (text, isUrgent, mood) => {
    setSubmitting(true);
    try {
      await churchPrayersApi.add({ text, isUrgent, mood });
      showSuccess("Adăugat!");
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e.message || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePrayer = async (id) => {
    try {
      await churchPrayersApi.remove(id);
      load();
    } catch (e) {
      showError("Eroare");
    }
  };

  const answerPrayer = async (id) => {
    try {
      await churchPrayersApi.update(id, { answered: true });
      load();
    } catch (e) {
      showError("Eroare");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#21c063" />
      </View>
    );
  }

  return (
    <>
      <PrayerListDetail
        title="Rugăciunile bisericii"
        prayers={prayers}
        isPublic
        expired={false}
        canAdd={canManage}
        canEditItems={canManage}
        fabColor="#f59e0b"
        fabBottom={fabBottom}
        currentUserId={currentUserId}
        onAddPress={() => setFormOpen(true)}
        onDeletePrayer={deletePrayer}
        onAnswerPrayer={answerPrayer}
        emptyText="Niciun motiv încă"
      />
      <PrayerFormModal
        visible={formOpen}
        submitting={submitting}
        title="Motiv al bisericii"
        onClose={() => setFormOpen(false)}
        onSubmit={submitPrayer}
      />
    </>
  );
};

export default ChurchListView;
