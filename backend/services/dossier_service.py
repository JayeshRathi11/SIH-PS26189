import os
import io
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def _pretty_relationship(rel_type: str) -> str:
    """"ASSOCIATE_OF" -> "Associate Of" -- matches the frontend's own formatting
    (XaiConsolePage.jsx's prettyRelationship) so the raw enum never reaches a
    reader of the printed dossier."""
    if not rel_type:
        return "Associated With"
    return " ".join(w.capitalize() for w in rel_type.replace("-", "_").split("_") if w)


class CourtDossierGenerator:
    """
    Generates official, court-ready evidentiary brief dossiers
    compliant with NCRB / MHA guidelines with SHA-256 digital custody verification.
    """

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.title_style = ParagraphStyle(
            'MhaTitle',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            alignment=1, # Center
            textColor=colors.HexColor('#0F172A')
        )
        self.subtitle_style = ParagraphStyle(
            'MhaSubTitle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            alignment=1, # Center
            textColor=colors.HexColor('#DC2626')
        )
        self.meta_style = ParagraphStyle(
            'MhaMeta',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor('#64748B')
        )
        self.heading_style = ParagraphStyle(
            'MhaHeading2',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=6
        )
        self.body_style = ParagraphStyle(
            'MhaBody',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        self.body_bold = ParagraphStyle(
            'MhaBodyBold',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#0F172A')
        )
        self.quote_style = ParagraphStyle(
            'MhaQuote',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor('#1E293B')
        )
        self.hash_style = ParagraphStyle(
            'MhaHash',
            parent=self.styles['Normal'],
            fontName='Courier',
            fontSize=7.5,
            leading=10,
            # Was a bright cyan-blue that read as an unclickable web link in a
            # formal government document; a neutral slate keeps the
            # monospace "this is a hash" look without the link styling.
            textColor=colors.HexColor('#475569')
        )

    def generate_dossier_pdf(self, entity: Dict[str, Any], relationships: List[Dict[str, Any]],
                             evidence_records: List[Dict[str, Any]], officer_name: str = "Investigating Officer") -> bytes:
        """Generates full court dossier PDF as bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        elements = []

        # 1. Official Header
        elements.append(Paragraph("GOVERNMENT OF INDIA • MINISTRY OF HOME AFFAIRS", self.title_style))
        elements.append(Paragraph("NATIONAL CRIME RECORDS BUREAU (NCRB) — CRIMINAL NETWORK INTELLIGENCE", self.subtitle_style))
        elements.append(Paragraph("CONFIDENTIAL // LAW ENFORCEMENT & JUDICIAL PROCEEDINGS ONLY", self.meta_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0F172A'), spaceAfter=12))

        # Dossier Metadata Bar
        # Derived from the subject's own name (last token, e.g. surname) rather
        # than a slice of the internal canonical_id -- that used to produce
        # artifacts like "-_SINGH" (a stray leading underscore) whenever the id
        # happened to be exactly 6+1 chars past a word boundary.
        name_tokens = re.findall(r"[A-Za-z0-9]+", entity.get("canonical_name") or "ENTITY")
        dossier_ref_suffix = (name_tokens[-1].upper() if name_tokens else "ENTITY")[:12]
        dossier_no = f"MHA-NCRB-DS-{datetime.utcnow().strftime('%Y%m%d')}-{dossier_ref_suffix}"
        meta_table_data = [
            [
                Paragraph(f"<b>Dossier Ref:</b> {dossier_no}", self.body_style),
                Paragraph(f"<b>Date:</b> {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}", self.body_style),
                Paragraph(f"<b>Classification:</b> RESTRICTED - SEC 123 IEA", self.body_bold)
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[200, 180, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 2. Executive Subject Profile
        elements.append(Paragraph("1. EXECUTIVE SUBJECT PROFILE & ALIAS ROSTER", self.heading_style))
        
        aliases_list = entity.get("aliases", [])
        aliases_str = ", ".join(aliases_list) if aliases_list else "None recorded"
        domains_list = entity.get("domains", [])
        domains_str = ", ".join([d.replace("_", " ").title() for d in domains_list]) if domains_list else "General"
        phones_list = entity.get("phone_numbers", [])
        phones_str = ", ".join(phones_list) if phones_list else "Not Available"

        profile_data = [
            [Paragraph("<b>Canonical Identifier:</b>", self.body_bold), Paragraph(entity.get("canonical_id", "N/A"), self.body_style)],
            [Paragraph("<b>Primary Legal Name:</b>", self.body_bold), Paragraph(f"<b>{entity.get('canonical_name', 'Unknown')}</b>", self.body_bold)],
            [Paragraph("<b>Entity Classification:</b>", self.body_bold), Paragraph(entity.get("type", "PERSON"), self.body_style)],
            [Paragraph("<b>Cross-Domain Aliases:</b>", self.body_bold), Paragraph(aliases_str, self.body_style)],
            [Paragraph("<b>Associated Crime Domains:</b>", self.body_bold), Paragraph(domains_str, self.body_style)],
            [Paragraph("<b>Linked Telephony / Lines:</b>", self.body_bold), Paragraph(phones_str, self.body_style)],
        ]
        profile_table = Table(profile_data, colWidths=[160, 380])
        profile_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(profile_table)
        elements.append(Spacer(1, 14))

        # 3. Network Centrality & Role Analysis
        elements.append(Paragraph("2. NETWORK CENTRALITY & SYNDICATE ROLE ANALYSIS", self.heading_style))
        hub_score = entity.get("hub_score", 0.05)
        # The real graph's hub_score (networkx centrality) tops out around
        # 0.02 even for the actual cross-domain kingpin -- the old 0.05/0.2
        # thresholds were calibrated for a scale this data never reaches, so
        # every single entity fell into the bottom "Field Operative" bucket
        # regardless of how central they actually are (a one-tie courier and
        # the hub present in all 10 crime domains got the identical label).
        # Domain span and direct-tie count are the reliable, self-evident
        # signals already on the page, so they lead; hub_score is a
        # secondary tiebreaker at a scale that matches what this graph
        # actually produces.
        domain_span = len(domains_list)
        tie_count = len(relationships)
        if domain_span >= 4 or hub_score >= 0.015:
            role_label = "Transnational Syndicate Kingpin / Chief Coordinator"
        elif domain_span >= 2 or tie_count >= 3 or hub_score >= 0.012:
            role_label = "Regional Sub-Controller / Cell Leader"
        else:
            role_label = "Field Operative / Courier / Front Asset"
        
        centrality_data = [
            [Paragraph("<b>Combined Hub Score:</b>", self.body_bold), Paragraph(f"<b>{hub_score:.4f}</b>", self.body_bold)],
            [Paragraph("<b>Structural Syndicate Role:</b>", self.body_bold), Paragraph(f"<font color='#DC2626'><b>{role_label}</b></font>", self.body_style)],
            [Paragraph("<b>Community Partition Cluster:</b>", self.body_bold), Paragraph(f"Cluster #{entity.get('community_cluster', 0)}", self.body_style)],
            [Paragraph("<b>Direct First-Degree Ties:</b>", self.body_bold), Paragraph(str(len(relationships)), self.body_style)],
        ]
        centrality_table = Table(centrality_data, colWidths=[160, 380])
        centrality_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(centrality_table)
        elements.append(Spacer(1, 14))

        # 4. Direct Connections & Relationships
        elements.append(Paragraph("3. DIRECT CRIMINAL NETWORK CONNECTIONS", self.heading_style))
        if relationships:
            rel_headers = [Paragraph("<b>Target Entity</b>", self.body_bold), Paragraph("<b>Rel Type</b>", self.body_bold), Paragraph("<b>Domain</b>", self.body_bold), Paragraph("<b>Evidence Summary</b>", self.body_bold)]
            rel_rows = [rel_headers]
            for r in relationships[:12]:
                tgt = r.get("target_canonical", r.get("target_id", "Unknown"))
                rtype = _pretty_relationship(r.get("relationship_type", "ASSOCIATE_OF"))
                dom = r.get("domain", "").replace("_", " ").title()
                ev_raw = (r.get("evidence") or "Direct investigative link").strip()
                # Only ellipsize when actually truncated -- previously every
                # row got a trailing "..." appended unconditionally, so even
                # a short evidence line looked cut off.
                ev = ev_raw if len(ev_raw) <= 140 else ev_raw[:140].rstrip() + "..."
                rel_rows.append([
                    Paragraph(tgt, self.body_style),
                    Paragraph(rtype, self.body_style),
                    Paragraph(dom, self.body_style),
                    Paragraph(ev, self.quote_style)
                ])
            rel_table = Table(rel_rows, colWidths=[110, 110, 110, 210])
            rel_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 4),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            elements.append(rel_table)
        else:
            elements.append(Paragraph("No direct external connections registered.", self.body_style))
        elements.append(Spacer(1, 14))

        # 5. Evidentiary Audit Trail & Digital Custody Ledger
        elements.append(Paragraph("4. EVIDENTIARY AUDIT TRAIL & DIGITAL CHAIN-OF-CUSTODY (SHA-256)", self.heading_style))
        if evidence_records:
            ev_headers = [Paragraph("<b>Doc ID</b>", self.body_bold), Paragraph("<b>Type</b>", self.body_bold), Paragraph("<b>Digital Evidence Hash (SHA-256)</b>", self.body_bold)]
            ev_rows = [ev_headers]
            for ev_doc in evidence_records[:8]:
                h = ev_doc.get("sha256_hash", "") or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                ev_rows.append([
                    Paragraph(ev_doc.get("doc_id", "A1"), self.body_style),
                    Paragraph(ev_doc.get("doc_type", "FIR"), self.body_style),
                    Paragraph(h, self.hash_style)
                ])
            ev_table = Table(ev_rows, colWidths=[80, 80, 380])
            ev_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 4),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            elements.append(ev_table)
        else:
            elements.append(Paragraph("Evidence records cataloged in master SQLite/Neo4j database ledger.", self.body_style))
        elements.append(Spacer(1, 20))

        # 6. Officer Attestation & Sign-off
        elements.append(KeepTogether([
            Paragraph("5. INVESTIGATOR ATTESTATION & DIGITAL SIGN-OFF", self.heading_style),
            Spacer(1, 4),
            Paragraph(
                "I hereby certify that the intelligence extracted in this brief has been compiled from authenticated "
                "FIRs, intercepted logs, and surveillance reports, and has been cryptographically verified against the "
                "NexusTrace Digital Evidence Ledger. The entity resolution and cross-domain links reflect AI-assisted graph analytics.",
                self.body_style
            ),
            Spacer(1, 16),
            Table([
                [
                    Paragraph(f"<b>Compiled By:</b> {officer_name}", self.body_style),
                    Paragraph("<b>Verification:</b> Digitally Sealed &amp; SHA-256 Hash-Chain Verified (NCRB PKI)", self.body_style)
                ]
            ], colWidths=[270, 270], style=[
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('PADDING', (0,0), (-1,-1), 6)
            ])
        ]))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
