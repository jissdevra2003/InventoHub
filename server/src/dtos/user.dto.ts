

// DTO for user registration
//Only contain fields which are sent from frontend to backend
export interface registerDto {
    market: {
            market_name: string;
            market_email: string;
            market_phone: string;
            
            logoUrl?: string;
            address?: string;
            gstNumber?: string;
            industryType?: string; // retail, wholesale, manufacturing etc. But for now just string
        
            country?: string;
            state?: string;
            city?: string;
            postal_code?: string;
           
    },
    owner: {
          username: string;
          name: string;
          phone?: string;
          email: string;
          password: string;
          address?: string;   
          profile_image?: string;
    }
}