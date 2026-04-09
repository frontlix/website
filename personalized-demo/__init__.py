"""Personalized demo module — gescheiden van de lead-automation branche-flow.

Dit systeem is voor warme leads die een persoonlijke demo-link ontvangen.
De LLM past zich aan op basis van de briefing uit de personalized_demos tabel.

Verschil met lead-automation:
- Geen branche-keuze nodig (briefing bepaalt het gesprek)
- Gebruikt demo_persoonlijk WhatsApp template
- Eigen LLM prompts die de briefing meenemen
- Leads krijgen demo_type="personalized" in de leads tabel
"""
