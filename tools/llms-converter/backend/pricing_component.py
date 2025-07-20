# pricing_component.py
"""
Pricing component for LLMS File Builder
Displays pricing tiers and handles upgrade flows
"""
import streamlit as st

def display_pricing_tiers():
    """Display pricing tiers in a nice format"""
    
    st.header("💰 Choose Your Plan")
    
    # Create columns for pricing tiers
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div style="border: 2px solid #e0e0e0; border-radius: 10px; padding: 20px; text-align: center;">
            <h3>🆓 Free</h3>
            <h2>$0</h2>
            <p>Perfect for trying out the tool</p>
            <hr>
            <ul style="text-align: left; padding-left: 20px;">
                <li>✅ Up to 50 pages</li>
                <li>✅ Basic processing</li>
                <li>✅ LLMS.txt export</li>
                <li>✅ JSON export</li>
                <li>❌ No AI enhancement</li>
                <li>❌ Standard support</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div style="border: 3px solid #4CAF50; border-radius: 10px; padding: 20px; text-align: center; background-color: #f8fff8;">
            <h3>🚀 Pro</h3>
            <h2>$29<span style="font-size: 14px;">/month</span></h2>
            <p><strong>Most Popular</strong></p>
            <hr>
            <ul style="text-align: left; padding-left: 20px;">
                <li>✅ Up to 500 pages</li>
                <li>✅ AI enhancement</li>
                <li>✅ Priority processing</li>
                <li>✅ LLMS.txt export</li>
                <li>✅ JSON export</li>
                <li>✅ Premium support</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div style="border: 2px solid #9C27B0; border-radius: 10px; padding: 20px; text-align: center;">
            <h3>🏢 Enterprise</h3>
            <h2>Contact us</h2>
            <p>For large organizations</p>
            <hr>
            <ul style="text-align: left; padding-left: 20px;">
                <li>✅ Unlimited pages</li>
                <li>✅ AI enhancement</li>
                <li>✅ Priority processing</li>
                <li>✅ Custom features</li>
                <li>✅ API access</li>
                <li>✅ Dedicated support</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

def show_upgrade_prompt(current_tier: str, required_tier: str = "pro"):
    """Show upgrade prompt when limits are exceeded"""
    
    if current_tier == "free" and required_tier == "pro":
        st.error("🚫 **Upgrade Required**")
        st.markdown("""
        Your file exceeds the **Free plan limit of 50 pages**.
        
        **Upgrade to Pro** to process larger files and unlock AI enhancement:
        
        🚀 **Pro Plan - $29/month**
        - Process up to 500 pages
        - AI-powered title and description optimization
        - Priority processing
        - Premium support
        """)
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🚀 Upgrade to Pro", type="primary", key="upgrade_prompt"):
                st.balloons()
                st.success("Upgrade feature coming soon with Shipfast integration!")
        
        with col2:
            if st.button("✂️ Process first 50 pages", type="secondary", key="process_limited"):
                return "process_limited"
    
    elif current_tier == "pro" and required_tier == "enterprise":
        st.error("🚫 **Enterprise Plan Required**")
        st.markdown("""
        Your file exceeds the **Pro plan limit of 500 pages**.
        
        **Contact us** for Enterprise pricing to process unlimited files.
        """)
        
        if st.button("📞 Contact Sales", type="primary", key="contact_sales"):
            st.success("Enterprise inquiries: hello@nectarstack.com")
    
    return None

def show_feature_lock(feature_name: str, required_tier: str = "pro"):
    """Show feature lock message"""
    
    if required_tier == "pro":
        st.warning(f"🔒 **{feature_name}** requires Pro plan")
        st.markdown("""
        **Unlock with Pro ($29/month):**
        - AI-powered content optimization
        - Process up to 500 pages
        - Priority processing
        - Premium support
        """)
        
        if st.button(f"🚀 Upgrade for {feature_name}", key=f"upgrade_{feature_name}"):
            st.balloons()
            st.success("Upgrade feature coming soon!")

def calculate_savings(annual: bool = False):
    """Calculate potential savings"""
    
    st.markdown("### 💡 **Limited Time: Launch Special**")
    
    if annual:
        monthly_cost = 29
        annual_cost = monthly_cost * 12
        discounted_annual = annual_cost * 0.8  # 20% discount
        savings = annual_cost - discounted_annual
        
        st.markdown(f"""
        **Save ${savings:.0f}** with annual billing!
        
        - Monthly: ${monthly_cost}/month
        - Annual: ${discounted_annual:.0f}/year (${discounted_annual/12:.0f}/month)
        - **You save: ${savings:.0f}**
        """)
    else:
        st.markdown("""
        **Launch Special: First 100 customers get 50% off!**
        
        - Pro Plan: ~~$29/month~~ **$14.50/month** for 3 months
        - Enterprise: Custom pricing with 30% discount
        """)

def show_plan_comparison():
    """Show detailed plan comparison"""
    
    st.header("📊 Plan Comparison")
    
    # Create comparison data
    comparison_data = {
        "Feature": [
            "Pages per file",
            "AI Enhancement",
            "Processing Speed",
            "File Formats",
            "Support",
            "API Access",
            "Custom Features"
        ],
        "Free": [
            "50 pages",
            "❌",
            "Standard",
            "CSV, TXT, JSON",
            "Community",
            "❌",
            "❌"
        ],
        "Pro": [
            "500 pages",
            "✅",
            "Priority",
            "CSV, TXT, JSON",
            "Premium",
            "❌",
            "❌"
        ],
        "Enterprise": [
            "Unlimited",
            "✅",
            "Priority",
            "CSV, TXT, JSON, API",
            "Dedicated",
            "✅",
            "✅"
        ]
    }
    
    # Display as table
    import pandas as pd
    df = pd.DataFrame(comparison_data)
    
    # Style the dataframe
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True
    )

if __name__ == "__main__":
    # Demo the pricing component
    display_pricing_tiers()
    st.divider()
    calculate_savings()
    st.divider()
    show_plan_comparison()